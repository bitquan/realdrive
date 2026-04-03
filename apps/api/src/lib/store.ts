import { Prisma, Role as DbRole } from "@prisma/client";
import type {
  CommunityEligibility,
  DriverProfileUpdateInput,
  RideType
} from "@shared/contracts";
import { env } from "../config/env.js";
import { calculateDistanceMiles } from "../services/maps.js";
import type {
  AuthIdentity,
  DriverCandidate,
  Store,
  UpdateRideAdminPatch
} from "../services/types.js";
import { createCommunityAccessToken, createReferralCode } from "./codes.js";
import { prisma } from "./db.js";
import {
  fromDbPaymentStatus,
  mapCommunityComment,
  mapCommunityProposal,
  mapDispatchSettings,
  mapDriverAccount,
  mapDriverInterest,
  mapDriverRateCard,
  mapPlatformDue,
  mapPlatformPayoutSettings,
  mapPricingRule,
  mapRide,
  mapRiderLead,
  mapSessionUser,
  toDbCommunityVoteChoice,
  toDbDriverApprovalStatus,
  toDbDriverPricingMode,
  toDbDuePaymentMethod,
  toDbPaymentMethod,
  toDbPaymentStatus,
  toDbPlatformDueStatus,
  toDbRidePricingSource,
  toDbRideStatus,
  toDbRideType
} from "./mappers.js";

const DEFAULT_PLATFORM_RULES: Array<{
  rideType: RideType;
  baseFare: number;
  perMile: number;
  perMinute: number;
  multiplier: number;
}> = [
  { rideType: "standard", baseFare: 6, perMile: 2.2, perMinute: 0.4, multiplier: 1 },
  { rideType: "suv", baseFare: 10, perMile: 3.4, perMinute: 0.55, multiplier: 1.1 },
  { rideType: "xl", baseFare: 12, perMile: 4.1, perMinute: 0.65, multiplier: 1.2 }
];

const COMMUNITY_COMPLETED_RIDE_THRESHOLD = 51;

const userInclude = {
  driverProfile: {
    include: {
      vehicle: true
    }
  },
  driverRateCards: {
    orderBy: {
      rideType: "asc"
    }
  }
} as const;

const rideInclude = {
  rider: {
    include: userInclude
  },
  driver: {
    include: userInclude
  },
  offers: true,
  locationPings: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  }
} as const;

type UserWithDriver = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

function asAuthIdentity(user: UserWithDriver): AuthIdentity {
  return {
    ...mapSessionUser(user),
    passwordHash: user.passwordHash
  };
}

function hasDbRole(user: { role: DbRole; roles?: DbRole[] }, role: DbRole) {
  return user.role === role || user.roles?.includes(role) || false;
}

function isClaimableSeedAdmin(user: { role: DbRole; roles?: DbRole[]; email: string | null; name: string }) {
  return (
    hasDbRole(user, DbRole.ADMIN) &&
    (user.email?.toLowerCase() === "admin@realdrive.app" || user.name === "RealDrive Admin")
  );
}

function normalizeMarketKey(value?: string | null) {
  return value?.trim().toUpperCase() || "DEFAULT";
}

function normalizeStateList(states: string[]) {
  return Array.from(
    new Set(
      states
        .map((state) => state.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function ownerDriverFilter() {
  if (env.launchMode !== "solo_driver") {
    return {};
  }

  return {
    ...(env.ownerDriverUserId ? { id: env.ownerDriverUserId } : {}),
    ...(env.ownerDriverPhone ? { phone: env.ownerDriverPhone } : {})
  };
}

async function getRideOrThrow(rideId: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: rideInclude
  });

  if (!ride) {
    throw new Error("Ride not found");
  }

  return mapRide(ride);
}

async function ensureReferralCode(user: UserWithDriver): Promise<UserWithDriver> {
  if (user.referralCode) {
    return user;
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          referralCode: createReferralCode(user.name)
        },
        include: userInclude
      });

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a referral code");
}

async function ensureCommunityAccessToken(user: UserWithDriver): Promise<UserWithDriver> {
  if (user.communityAccessToken) {
    return user;
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          communityAccessToken: createCommunityAccessToken()
        },
        include: userInclude
      });

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a community access token");
}

async function findUserByContact(phone?: string | null, email?: string | null) {
  const [phoneUser, emailUser] = await Promise.all([
    phone
      ? prisma.user.findUnique({
          where: { phone },
          include: userInclude
        })
      : Promise.resolve(null),
    email
      ? prisma.user.findUnique({
          where: { email },
          include: userInclude
        })
      : Promise.resolve(null)
  ]);

  if (phoneUser && emailUser && phoneUser.id !== emailUser.id) {
    throw new Error("Phone number and email belong to different accounts");
  }

  return phoneUser ?? emailUser;
}

async function getDriverUserOrThrow(driverId: string) {
  const user = await prisma.user.findUnique({
    where: { id: driverId },
    include: userInclude
  });

  if (!user || !hasDbRole(user, DbRole.DRIVER) || !user.driverProfile) {
    throw new Error("Driver not found");
  }

  return user;
}

async function ensureDriverRateCards(tx: Prisma.TransactionClient, driverId: string) {
  const existing = await tx.driverRateCard.findMany({
    where: { driverId },
    orderBy: { rideType: "asc" }
  });

  if (existing.length >= 3) {
    return existing;
  }

  const defaultPlatformRules = await tx.pricingRule.findMany({
    where: { marketKey: "DEFAULT" },
    orderBy: { rideType: "asc" }
  });

  const sourceRules =
    defaultPlatformRules.length >= 3
      ? defaultPlatformRules.map((rule) => ({
          rideType: rule.rideType,
          baseFare: Number(rule.baseFare),
          perMile: Number(rule.perMile),
          perMinute: Number(rule.perMinute),
          multiplier: Number(rule.multiplier)
        }))
      : DEFAULT_PLATFORM_RULES.map((rule) => ({
          rideType: toDbRideType(rule.rideType),
          baseFare: rule.baseFare,
          perMile: rule.perMile,
          perMinute: rule.perMinute,
          multiplier: rule.multiplier
        }));

  for (const rule of sourceRules) {
    await tx.driverRateCard.upsert({
      where: {
        driverId_rideType: {
          driverId,
          rideType: rule.rideType
        }
      },
      update: {
        baseFare: rule.baseFare,
        perMile: rule.perMile,
        perMinute: rule.perMinute,
        multiplier: rule.multiplier
      },
      create: {
        driverId,
        rideType: rule.rideType,
        baseFare: rule.baseFare,
        perMile: rule.perMile,
        perMinute: rule.perMinute,
        multiplier: rule.multiplier
      }
    });
  }

  return tx.driverRateCard.findMany({
    where: { driverId },
    orderBy: { rideType: "asc" }
  });
}

async function ensureRoles(
  tx: Prisma.TransactionClient,
  userId: string,
  roles: DbRole[],
  nextPrimaryRole?: DbRole
) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      role: true,
      roles: true
    }
  });

  const mergedRoles = Array.from(new Set([...(user.roles ?? []), user.role, ...roles]));
  await tx.user.update({
    where: { id: userId },
    data: {
      role: nextPrimaryRole ?? user.role,
      roles: mergedRoles
    }
  });
}

async function ensurePayoutSettingsRecord(tx: Prisma.TransactionClient = prisma) {
  return tx.platformPayoutSettings.upsert({
    where: { id: "platform" },
    update: {},
    create: {
      id: "platform"
    }
  });
}

async function markOverduePlatformDuesInternal(now = new Date()) {
  const overdue = await prisma.platformDue.findMany({
    where: {
      status: "PENDING",
      dueAt: {
        lt: now
      }
    },
    include: {
      driver: {
        include: {
          driverProfile: true
        }
      },
      ride: {
        include: {
          rider: true
        }
      }
    }
  });

  if (!overdue.length) {
    return [];
  }

  const driverIds = Array.from(new Set(overdue.map((due) => due.driverId)));

  await prisma.$transaction([
    prisma.platformDue.updateMany({
      where: {
        id: {
          in: overdue.map((due) => due.id)
        }
      },
      data: {
        status: "OVERDUE"
      }
    }),
    prisma.driverProfile.updateMany({
      where: {
        userId: {
          in: driverIds
        }
      },
      data: {
        available: false
      }
    })
  ]);

  const refreshed = await prisma.platformDue.findMany({
    where: {
      id: {
        in: overdue.map((due) => due.id)
      }
    },
    include: {
      driver: {
        include: {
          driverProfile: true
        }
      },
      ride: {
        include: {
          rider: true
        }
      }
    }
  });

  return refreshed.map(mapPlatformDue);
}

function buildVehicleUpdate(patch: DriverProfileUpdateInput["vehicle"]) {
  if (!patch) {
    return undefined;
  }

  const data: Record<string, unknown> = {};
  if (patch.makeModel !== undefined) {
    data.makeModel = patch.makeModel;
  }
  if (patch.plate !== undefined) {
    data.plate = patch.plate;
  }
  if (patch.color !== undefined) {
    data.color = patch.color ?? null;
  }
  if (patch.rideType !== undefined) {
    data.rideType = toDbRideType(patch.rideType);
  }
  if (patch.seats !== undefined) {
    data.seats = patch.seats;
  }

  if (Object.keys(data).length === 0) {
    return undefined;
  }

  return data;
}

export const store: Store = {
  async findSessionUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    return user ? mapSessionUser(user) : null;
  },

  async findUserForOtp(phone, role) {
    const user = await prisma.user.findFirst({
      where: {
        phone,
        OR: [
          { role: role === "driver" ? DbRole.DRIVER : DbRole.RIDER },
          { roles: { has: role === "driver" ? DbRole.DRIVER : DbRole.RIDER } }
        ]
      },
      include: userInclude
    });

    return user ? asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user))) : null;
  },

  async createRiderIdentity(input) {
    const normalizedPhone = input.phone ?? null;
    const normalizedEmail = input.email?.toLowerCase() ?? null;
    const existing = await findUserByContact(normalizedPhone, normalizedEmail);

    if (existing && !hasDbRole(existing, DbRole.RIDER)) {
      throw new Error("Contact information is already assigned to a non-rider account");
    }

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            phone: normalizedPhone ?? existing.phone,
            email: normalizedEmail ?? existing.email,
            roles: {
              set: Array.from(new Set([...(existing.roles ?? []), existing.role, DbRole.RIDER]))
            },
            riderProfile: {
              upsert: {
                update: {},
                create: {}
              }
            }
          },
          include: userInclude
        })
      : await prisma.user.create({
          data: {
            role: DbRole.RIDER,
            roles: [DbRole.RIDER],
            name: input.name,
            phone: normalizedPhone,
            email: normalizedEmail,
            riderProfile: {
              create: {}
            }
          },
          include: userInclude
        });

    return asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user)));
  },

  async getAdminSetupStatus() {
    const admins = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      select: {
        id: true,
        role: true,
        roles: true,
        email: true,
        name: true
      }
    });

    const needsSetup =
      admins.length === 0 ||
      (admins.length === 1 && isClaimableSeedAdmin(admins[0]));

    return { needsSetup };
  },

  async setupAdmin(input) {
    const email = input.email.toLowerCase();
    const admins = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      include: userInclude,
      orderBy: { createdAt: "asc" }
    });

    if (admins.length === 0) {
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            role: DbRole.ADMIN,
            roles: input.driverProfile ? [DbRole.ADMIN, DbRole.DRIVER] : [DbRole.ADMIN],
            name: input.name,
            email,
            passwordHash: input.passwordHash,
            phone: input.driverProfile?.phone,
            driverProfile: input.driverProfile
              ? {
                  create: {
                    approved: true,
                    approvalStatus: "APPROVED",
                    available: false,
                    homeState: input.driverProfile.homeState.toUpperCase(),
                    homeCity: input.driverProfile.homeCity,
                    localDispatchEnabled: true,
                    localRadiusMiles: 25,
                    serviceAreaDispatchEnabled: true,
                    serviceAreaStates: [input.driverProfile.homeState.toUpperCase()],
                    nationwideDispatchEnabled: false,
                    pricingMode: "PLATFORM",
                    vehicle: {
                      create: {
                        makeModel: input.driverProfile.vehicle.makeModel,
                        plate: input.driverProfile.vehicle.plate,
                        color: input.driverProfile.vehicle.color ?? null,
                        rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                        seats: input.driverProfile.vehicle.seats
                      }
                    }
                  }
                }
              : undefined
          },
          include: userInclude
        });

        if (input.driverProfile) {
          await ensureDriverRateCards(tx, user.id);
        }

        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: userInclude
        });
      });

      return asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(created)));
    }

    if (admins.length === 1 && isClaimableSeedAdmin(admins[0])) {
      const updated = await prisma.$transaction(async (tx) => {
        if (input.driverProfile) {
          await ensureRoles(tx, admins[0].id, [DbRole.ADMIN, DbRole.DRIVER], DbRole.ADMIN);
        } else {
          await ensureRoles(tx, admins[0].id, [DbRole.ADMIN], DbRole.ADMIN);
        }

        const user = await tx.user.update({
          where: { id: admins[0].id },
          data: {
            name: input.name,
            email,
            passwordHash: input.passwordHash,
            phone: input.driverProfile?.phone ?? undefined,
            driverProfile: input.driverProfile
              ? {
                  upsert: {
                    update: {
                      approved: true,
                      approvalStatus: "APPROVED",
                      available: false,
                      homeState: input.driverProfile.homeState.toUpperCase(),
                      homeCity: input.driverProfile.homeCity,
                      localDispatchEnabled: true,
                      localRadiusMiles: 25,
                      serviceAreaDispatchEnabled: true,
                      serviceAreaStates: [input.driverProfile.homeState.toUpperCase()],
                      nationwideDispatchEnabled: false,
                      pricingMode: "PLATFORM",
                      vehicle: {
                        upsert: {
                          update: {
                            makeModel: input.driverProfile.vehicle.makeModel,
                            plate: input.driverProfile.vehicle.plate,
                            color: input.driverProfile.vehicle.color ?? null,
                            rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                            seats: input.driverProfile.vehicle.seats
                          },
                          create: {
                            makeModel: input.driverProfile.vehicle.makeModel,
                            plate: input.driverProfile.vehicle.plate,
                            color: input.driverProfile.vehicle.color ?? null,
                            rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                            seats: input.driverProfile.vehicle.seats
                          }
                        }
                      }
                    },
                    create: {
                      approved: true,
                      approvalStatus: "APPROVED",
                      available: false,
                      homeState: input.driverProfile.homeState.toUpperCase(),
                      homeCity: input.driverProfile.homeCity,
                      localDispatchEnabled: true,
                      localRadiusMiles: 25,
                      serviceAreaDispatchEnabled: true,
                      serviceAreaStates: [input.driverProfile.homeState.toUpperCase()],
                      nationwideDispatchEnabled: false,
                      pricingMode: "PLATFORM",
                      vehicle: {
                        create: {
                          makeModel: input.driverProfile.vehicle.makeModel,
                          plate: input.driverProfile.vehicle.plate,
                          color: input.driverProfile.vehicle.color ?? null,
                          rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                          seats: input.driverProfile.vehicle.seats
                        }
                      }
                    }
                  }
                }
              : undefined
          },
          include: userInclude
        });

        if (input.driverProfile) {
          await ensureDriverRateCards(tx, user.id);
        }

        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: userInclude
        });
      });

      return asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(updated)));
    }

    throw new Error("Admin setup has already been completed");
  },

  async findAdminByEmail(email) {
    const user = await prisma.user.findFirst({
      where: {
        email,
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      include: userInclude
    });

    return user ? asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user))) : null;
  },

  async findDriverByEmail(email) {
    const user = await prisma.user.findFirst({
      where: {
        email,
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      include: userInclude
    });

    return user ? asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user))) : null;
  },

  async createDriverRole(userId, input) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    if (!existing) {
      throw new Error("User not found");
    }

    if (existing.driverProfile) {
      throw new Error("Driver profile already exists");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await ensureRoles(tx, userId, [DbRole.DRIVER], existing.role === DbRole.RIDER ? DbRole.DRIVER : existing.role);

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          phone: input.phone,
          driverProfile: {
            create: {
              approved: true,
              approvalStatus: "APPROVED",
              available: false,
              homeState: input.homeState.toUpperCase(),
              homeCity: input.homeCity,
              localDispatchEnabled: true,
              localRadiusMiles: 25,
              serviceAreaDispatchEnabled: true,
              serviceAreaStates: [input.homeState.toUpperCase()],
              nationwideDispatchEnabled: false,
              pricingMode: "PLATFORM",
              vehicle: {
                create: {
                  makeModel: input.vehicle.makeModel,
                  plate: input.vehicle.plate,
                  color: input.vehicle.color ?? null,
                  rideType: toDbRideType(input.vehicle.rideType),
                  seats: input.vehicle.seats
                }
              }
            }
          }
        },
        include: userInclude
      });

      await ensureDriverRateCards(tx, user.id);

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userInclude
      });
    });

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(updated)));
  },

  async createDriverAccount(input) {
    const email = input.email.toLowerCase();
    const phone = input.phone;
    const existing = await findUserByContact(phone, email);

    if (existing) {
      throw new Error("A user with that phone number or email already exists");
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: DbRole.DRIVER,
          roles: [DbRole.DRIVER],
          name: input.name,
          email,
          phone,
          passwordHash: input.passwordHash,
          driverProfile: {
            create: {
              approved: false,
              approvalStatus: "PENDING",
              available: false,
              homeState: input.homeState.toUpperCase(),
              homeCity: input.homeCity,
              localDispatchEnabled: true,
              localRadiusMiles: 25,
              serviceAreaDispatchEnabled: true,
              serviceAreaStates: [input.homeState.toUpperCase()],
              nationwideDispatchEnabled: false,
              pricingMode: "PLATFORM",
              vehicle: {
                create: {
                  makeModel: input.vehicle.makeModel,
                  plate: input.vehicle.plate,
                  color: input.vehicle.color ?? null,
                  rideType: toDbRideType(input.vehicle.rideType),
                  seats: input.vehicle.seats
                }
              }
            }
          }
        },
        include: userInclude
      });

      await ensureDriverRateCards(tx, user.id);

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userInclude
      });
    });

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(created)));
  },

  async getDriverAccount(driverId) {
    const user = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    if (!user || !hasDbRole(user, DbRole.DRIVER) || !user.driverProfile) {
      return null;
    }

    await ensureDriverRateCards(prisma, user.id);
    const refreshed = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    return refreshed?.driverProfile
      ? mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(refreshed)))
      : null;
  },

  async updateDriverProfile(driverId, patch) {
    await getDriverUserOrThrow(driverId);
    const vehicleUpdate = buildVehicleUpdate(patch.vehicle);

    const updated = await prisma.user.update({
      where: { id: driverId },
      data: {
        name: patch.name,
        phone: patch.phone,
        driverProfile: {
          update: {
            homeState: patch.homeState?.toUpperCase(),
            homeCity: patch.homeCity,
            vehicle: vehicleUpdate
              ? {
                  update: vehicleUpdate
                }
              : undefined
          }
        }
      },
      include: userInclude
    });

    if (!updated.driverProfile) {
      throw new Error("Driver profile missing");
    }

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(updated)));
  },

  async getDriverDispatchSettings(driverId) {
    const user = await getDriverUserOrThrow(driverId);
    return mapDispatchSettings(user.driverProfile!);
  },

  async updateDriverDispatchSettings(driverId, settings) {
    const updated = await prisma.user.update({
      where: { id: driverId },
      data: {
        driverProfile: {
          update: {
            localDispatchEnabled: settings.localEnabled,
            localRadiusMiles: settings.localRadiusMiles,
            serviceAreaDispatchEnabled: settings.serviceAreaEnabled,
            serviceAreaStates: normalizeStateList(settings.serviceAreaStates),
            nationwideDispatchEnabled: settings.nationwideEnabled
          }
        }
      },
      include: userInclude
    });

    if (!updated.driverProfile) {
      throw new Error("Driver profile missing");
    }

    return mapDispatchSettings(updated.driverProfile);
  },

  async getDriverRateCard(driverId) {
    await getDriverUserOrThrow(driverId);
    await ensureDriverRateCards(prisma, driverId);
    const refreshed = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    if (!refreshed) {
      throw new Error("Driver not found");
    }

    return mapDriverRateCard(refreshed);
  },

  async replaceDriverRateCard(driverId, input) {
    await getDriverUserOrThrow(driverId);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.driverProfile.update({
        where: { userId: driverId },
        data: {
          pricingMode: toDbDriverPricingMode(input.pricingMode)
        }
      });

      for (const rule of input.rules) {
        await tx.driverRateCard.upsert({
          where: {
            driverId_rideType: {
              driverId,
              rideType: toDbRideType(rule.rideType)
            }
          },
          update: {
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          },
          create: {
            driverId,
            rideType: toDbRideType(rule.rideType),
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          }
        });
      }

      if (input.rules.length) {
        await tx.driverRateCard.deleteMany({
          where: {
            driverId,
            rideType: {
              notIn: input.rules.map((rule) => toDbRideType(rule.rideType))
            }
          }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: driverId },
        include: userInclude
      });
    });

    return mapDriverRateCard(updated);
  },

  async findUserByReferralCode(referralCode) {
    const user = await prisma.user.findUnique({
      where: { referralCode },
      include: userInclude
    });

    return user ? mapSessionUser(user) : null;
  },

  async findUserByCommunityAccessToken(token) {
    const user = await prisma.user.findUnique({
      where: { communityAccessToken: token },
      include: userInclude
    });

    return user ? mapSessionUser(user) : null;
  },

  async ensureUserReferralCode(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    if (!user) {
      throw new Error("User not found");
    }

    return mapSessionUser(await ensureReferralCode(user));
  },

  async ensureUserCommunityAccessToken(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    if (!user) {
      throw new Error("User not found");
    }

    return (await ensureCommunityAccessToken(user)).communityAccessToken!;
  },

  async listPlatformPricingRules() {
    const rules = await prisma.pricingRule.findMany({
      orderBy: [{ marketKey: "asc" }, { rideType: "asc" }]
    });

    return rules.map(mapPricingRule);
  },

  async replacePlatformPricingRules(rules) {
    await prisma.$transaction(
      rules.map((rule) =>
        prisma.pricingRule.upsert({
          where: {
            marketKey_rideType: {
              marketKey: normalizeMarketKey(rule.marketKey),
              rideType: toDbRideType(rule.rideType)
            }
          },
          update: {
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          },
          create: {
            marketKey: normalizeMarketKey(rule.marketKey),
            rideType: toDbRideType(rule.rideType),
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          }
        })
      )
    );

    return this.listPlatformPricingRules();
  },

  async createRide(input) {
    const ride = await prisma.ride.create({
      data: {
        riderId: input.riderId,
        rideType: toDbRideType(input.rideType),
        status: toDbRideStatus(input.status),
        publicTrackingToken: input.publicTrackingToken,
        referredByUserId: input.referredByUserId ?? null,
        referredByCode: input.referredByCode ?? null,
        pickupAddress: input.route.pickup.address,
        pickupLat: input.route.pickup.lat,
        pickupLng: input.route.pickup.lng,
        pickupStateCode: input.route.pickup.stateCode?.toUpperCase() ?? null,
        dropoffAddress: input.route.dropoff.address,
        dropoffLat: input.route.dropoff.lat,
        dropoffLng: input.route.dropoff.lng,
        dropoffStateCode: input.route.dropoff.stateCode?.toUpperCase() ?? null,
        estimatedMiles: input.route.distanceMiles,
        estimatedMinutes: input.route.durationMinutes,
        routeProvider: input.route.provider,
        platformMarketKey: normalizeMarketKey(input.platformMarketKey),
        estimatedPricingSource: toDbRidePricingSource(input.estimatedPricingSource ?? "platform_market"),
        quotedFare: input.quotedFare,
        estimatedPlatformDue: input.estimatedPlatformDue,
        estimatedCustomerTotal: input.estimatedCustomerTotal,
        paymentMethod: toDbPaymentMethod(input.paymentMethod),
        paymentStatus: toDbPaymentStatus("pending"),
        requestedAt: input.requestedAt,
        scheduledFor: input.scheduledFor
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async getRideById(rideId) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: rideInclude
    });

    return ride ? mapRide(ride) : null;
  },

  async getRideByPublicTrackingToken(token) {
    const ride = await prisma.ride.findUnique({
      where: { publicTrackingToken: token },
      include: rideInclude
    });

    return ride ? mapRide(ride) : null;
  },

  async listRiderRides(riderId) {
    const rides = await prisma.ride.findMany({
      where: { riderId },
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async listEligibleDriversForRide(pickup, pickupStateCode) {
    await markOverduePlatformDuesInternal();

    const drivers = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }],
        ...ownerDriverFilter(),
        platformDues: {
          none: {
            status: "OVERDUE"
          }
        },
        driverProfile: {
          is: {
            approved: true,
            available: true
          }
        }
      },
      include: userInclude
    });

    const normalizedPickupState = pickupStateCode?.toUpperCase() ?? null;

    return drivers
      .map((driver) => {
        if (!driver.driverProfile) {
          return null;
        }

        const profile = driver.driverProfile;
        const lat = profile.currentLat;
        const lng = profile.currentLng;
        const localDistance =
          profile.localDispatchEnabled && lat != null && lng != null
            ? calculateDistanceMiles(pickup, { lat, lng })
            : null;
        const localMatch =
          profile.localDispatchEnabled &&
          localDistance != null &&
          localDistance <= profile.localRadiusMiles;
        const serviceAreaMatch =
          profile.serviceAreaDispatchEnabled &&
          normalizedPickupState != null &&
          profile.serviceAreaStates.map((state) => state.toUpperCase()).includes(normalizedPickupState);
        const nationwideMatch = profile.nationwideDispatchEnabled;

        if (!localMatch && !serviceAreaMatch && !nationwideMatch) {
          return null;
        }

        return {
          ...mapDriverAccount(driver),
          lat,
          lng,
          rating: profile.rating,
          distance: localDistance
        };
      })
      .filter(
        (driver): driver is DriverCandidate & { distance: number | null } =>
          Boolean(driver)
      )
      .sort((left, right) => {
        if (left.distance != null && right.distance != null) {
          return left.distance - right.distance;
        }
        if (left.distance != null) {
          return -1;
        }
        if (right.distance != null) {
          return 1;
        }
        return left.name.localeCompare(right.name);
      })
      .map(({ distance: _distance, ...driver }) => driver);
  },

  async createRideOffers(rideId, driverIds, expiresAt) {
    if (driverIds.length) {
      await prisma.rideOffer.createMany({
        data: driverIds.map((driverId) => ({
          rideId,
          driverId,
          expiresAt
        })),
        skipDuplicates: true
      });
    }

    await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: toDbRideStatus(driverIds.length ? "offered" : "expired")
      }
    });

    return getRideOrThrow(rideId);
  },

  async claimRideOffer(rideId, driverId, acceptedAt) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.rideOffer.findUnique({
        where: {
          rideId_driverId: {
            rideId,
            driverId
          }
        }
      });

      if (!offer || offer.status !== "PENDING") {
        return null;
      }

      const claim = await tx.ride.updateMany({
        where: {
          id: rideId,
          driverId: null,
          status: "OFFERED"
        },
        data: {
          driverId,
          status: "ACCEPTED",
          acceptedAt
        }
      });

      if (claim.count === 0) {
        return null;
      }

      await tx.rideOffer.update({
        where: {
          rideId_driverId: {
            rideId,
            driverId
          }
        },
        data: {
          status: "ACCEPTED",
          respondedAt: acceptedAt
        }
      });

      await tx.rideOffer.updateMany({
        where: {
          rideId,
          driverId: { not: driverId },
          status: "PENDING"
        },
        data: {
          status: "EXPIRED",
          respondedAt: acceptedAt
        }
      });

      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: rideInclude
      });

      return ride ? mapRide(ride) : null;
    });
  },

  async applyAcceptedRidePricing(rideId, pricing) {
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: {
        finalFare: pricing.finalFare ?? undefined,
        finalPlatformDue: pricing.finalPlatformDue ?? undefined,
        finalCustomerTotal: pricing.finalCustomerTotal ?? undefined,
        finalPricingSource: pricing.finalPricingSource
          ? toDbRidePricingSource(pricing.finalPricingSource)
          : undefined,
        matchedDriverPricingMode: toDbDriverPricingMode(pricing.matchedDriverPricingMode)
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async declineRideOffer(rideId, driverId) {
    return prisma.$transaction(async (tx) => {
      await tx.rideOffer.update({
        where: {
          rideId_driverId: {
            rideId,
            driverId
          }
        },
        data: {
          status: "DECLINED",
          respondedAt: new Date()
        }
      });

      const pendingOffers = await tx.rideOffer.count({
        where: {
          rideId,
          status: "PENDING"
        }
      });

      if (pendingOffers === 0) {
        await tx.ride.update({
          where: { id: rideId },
          data: {
            status: "EXPIRED"
          }
        });
      }

      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: rideInclude
      });

      return ride ? mapRide(ride) : null;
    });
  },

  async expireRideOffers(rideId) {
    await prisma.$transaction([
      prisma.rideOffer.updateMany({
        where: {
          rideId,
          status: "PENDING"
        },
        data: {
          status: "EXPIRED",
          respondedAt: new Date()
        }
      }),
      prisma.ride.update({
        where: { id: rideId },
        data: {
          status: "EXPIRED"
        }
      })
    ]);

    return getRideOrThrow(rideId);
  },

  async listDriverOffers(driverId) {
    const rides = await prisma.ride.findMany({
      where: {
        offers: {
          some: {
            driverId,
            status: "PENDING"
          }
        }
      },
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async listActiveDriverRides(driverId) {
    const rides = await prisma.ride.findMany({
      where: {
        driverId,
        status: {
          in: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"]
        }
      },
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async updateRideStatus(rideId, patch) {
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: toDbRideStatus(patch.status),
        startedAt: patch.status === "in_progress" ? new Date() : undefined,
        completedAt: patch.status === "completed" ? new Date() : undefined,
        finalFare: patch.finalFare === null ? null : patch.finalFare ?? undefined,
        finalPlatformDue: patch.finalPlatformDue === null ? null : patch.finalPlatformDue ?? undefined,
        finalCustomerTotal: patch.finalCustomerTotal === null ? null : patch.finalCustomerTotal ?? undefined
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async updateRideAdmin(rideId, patch: UpdateRideAdminPatch) {
    const explicitPaymentStatus = patch.paymentStatus ? toDbPaymentStatus(patch.paymentStatus) : null;
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: patch.status ? toDbRideStatus(patch.status) : undefined,
        canceledAt: patch.status === "canceled" ? new Date() : undefined,
        paymentStatus: explicitPaymentStatus ?? undefined,
        fareOverride: patch.fareOverride === null ? null : patch.fareOverride ?? undefined,
        routeFallbackMiles: patch.routeFallbackMiles ?? undefined,
        quotedFare: patch.quotedFare ?? undefined,
        estimatedPlatformDue: patch.estimatedPlatformDue ?? undefined,
        estimatedCustomerTotal: patch.estimatedCustomerTotal ?? undefined,
        finalFare:
          patch.finalFare === null
            ? null
            : patch.finalFare ??
              (explicitPaymentStatus && fromDbPaymentStatus(explicitPaymentStatus) !== "pending"
                ? patch.fareOverride ?? patch.quotedFare ?? undefined
                : undefined),
        finalPlatformDue:
          patch.finalPlatformDue === null ? null : patch.finalPlatformDue ?? undefined,
        finalCustomerTotal:
          patch.finalCustomerTotal === null ? null : patch.finalCustomerTotal ?? undefined,
        finalPricingSource: patch.finalPricingSource
          ? toDbRidePricingSource(patch.finalPricingSource)
          : undefined,
        paymentCollectedById: patch.paymentCollectedById,
        paymentCollectedAt: patch.paymentCollectedAt
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async syncPlatformDueForRide(rideId) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId }
    });

    if (!ride || !ride.driverId || ride.status !== "COMPLETED") {
      return null;
    }

    const amount = Number(ride.finalPlatformDue ?? ride.estimatedPlatformDue);
    if (ride.paymentStatus === "WAIVED" || amount <= 0) {
      const existing = await prisma.platformDue.findUnique({
        where: { rideId },
        include: {
          driver: {
            include: {
              driverProfile: true
            }
          },
          ride: {
            include: {
              rider: true
            }
          }
        }
      });

      if (!existing) {
        return null;
      }

      const waived = await prisma.platformDue.update({
        where: { rideId },
        data: {
          status: "WAIVED",
          amount: 0
        },
        include: {
          driver: {
            include: {
              driverProfile: true
            }
          },
          ride: {
            include: {
              rider: true
            }
          }
        }
      });

      return mapPlatformDue(waived);
    }

    const due = await prisma.platformDue.upsert({
      where: { rideId },
      update: {
        driverId: ride.driverId,
        amount,
        dueAt: new Date((ride.completedAt ?? new Date()).getTime() + 48 * 60 * 60 * 1000),
        status: "PENDING"
      },
      create: {
        rideId,
        driverId: ride.driverId,
        amount,
        dueAt: new Date((ride.completedAt ?? new Date()).getTime() + 48 * 60 * 60 * 1000),
        status: "PENDING"
      },
      include: {
        driver: {
          include: {
            driverProfile: true
          }
        },
        ride: {
          include: {
            rider: true
          }
        }
      }
    });

    return mapPlatformDue(due);
  },

  async listDriverDues(driverId) {
    await markOverduePlatformDuesInternal();

    const dues = await prisma.platformDue.findMany({
      where: { driverId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: {
        driver: {
          include: {
            driverProfile: true
          }
        },
        ride: {
          include: {
            rider: true
          }
        }
      }
    });

    return dues.map(mapPlatformDue);
  },

  async listAllPlatformDues() {
    await markOverduePlatformDuesInternal();

    const dues = await prisma.platformDue.findMany({
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: {
        driver: {
          include: {
            driverProfile: true
          }
        },
        ride: {
          include: {
            rider: true
          }
        }
      }
    });

    return dues.map(mapPlatformDue);
  },

  async updatePlatformDue(dueId, patch) {
    const due = await prisma.platformDue.update({
      where: { id: dueId },
      data: {
        status: toDbPlatformDueStatus(patch.status),
        paymentMethod: patch.paymentMethod ? toDbDuePaymentMethod(patch.paymentMethod) : null,
        note: patch.note ?? null,
        resolvedById: patch.resolvedById ?? null,
        paidAt: patch.status === "paid" ? new Date() : null
      },
      include: {
        driver: {
          include: {
            driverProfile: true
          }
        },
        ride: {
          include: {
            rider: true
          }
        }
      }
    });

    const hasOverdue = await prisma.platformDue.count({
      where: {
        driverId: due.driverId,
        status: "OVERDUE"
      }
    });

    if (hasOverdue === 0) {
      await prisma.driverProfile.updateMany({
        where: {
          userId: due.driverId
        },
        data: {
          available: false
        }
      });
    }

    return mapPlatformDue(due);
  },

  async getPlatformPayoutSettings() {
    const settings = await ensurePayoutSettingsRecord();
    return mapPlatformPayoutSettings(settings);
  },

  async updatePlatformPayoutSettings(input) {
    const settings = await prisma.platformPayoutSettings.upsert({
      where: { id: "platform" },
      update: {
        cashAppHandle: input.cashAppHandle ?? undefined,
        zelleHandle: input.zelleHandle ?? undefined,
        jimHandle: input.jimHandle ?? undefined,
        cashInstructions: input.cashInstructions ?? undefined,
        otherInstructions: input.otherInstructions ?? undefined
      },
      create: {
        id: "platform",
        cashAppHandle: input.cashAppHandle ?? null,
        zelleHandle: input.zelleHandle ?? null,
        jimHandle: input.jimHandle ?? null,
        cashInstructions: input.cashInstructions ?? null,
        otherInstructions: input.otherInstructions ?? null
      }
    });

    return mapPlatformPayoutSettings(settings);
  },

  async markOverduePlatformDues(now) {
    return markOverduePlatformDuesInternal(now);
  },

  async driverHasOverdueDues(driverId) {
    await markOverduePlatformDuesInternal();

    const count = await prisma.platformDue.count({
      where: {
        driverId,
        status: "OVERDUE"
      }
    });

    return count > 0;
  },

  async recordLocation(input) {
    await prisma.$transaction([
      prisma.locationPing.create({
        data: {
          rideId: input.rideId,
          driverId: input.driverId,
          lat: input.lat,
          lng: input.lng,
          heading: input.heading,
          speed: input.speed
        }
      }),
      prisma.driverProfile.update({
        where: { userId: input.driverId },
        data: {
          currentLat: input.lat,
          currentLng: input.lng,
          lastLocationAt: new Date(),
          available: input.available
        }
      })
    ]);

    return getRideOrThrow(input.rideId);
  },

  async createRiderLead(input) {
    const lead = await prisma.riderLead.create({
      data: {
        userId: input.userId ?? null,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        referredByUserId: input.referredByUserId ?? null,
        referredByCode: input.referredByCode ?? null
      }
    });

    return mapRiderLead(lead);
  },

  async listRiderLeads() {
    const leads = await prisma.riderLead.findMany({
      orderBy: { createdAt: "desc" }
    });

    return leads.map(mapRiderLead);
  },

  async createDriverInterest(input) {
    const interest = await prisma.driverInterest.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        serviceArea: input.serviceArea,
        vehicleInfo: input.vehicleInfo,
        availabilityNotes: input.availabilityNotes ?? null
      }
    });

    return mapDriverInterest(interest);
  },

  async listDriverInterests() {
    const interests = await prisma.driverInterest.findMany({
      orderBy: { createdAt: "desc" }
    });

    return interests.map(mapDriverInterest);
  },

  async listAdminRides() {
    const rides = await prisma.ride.findMany({
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async listDrivers() {
    await markOverduePlatformDuesInternal();

    const drivers = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      orderBy: { createdAt: "asc" },
      include: userInclude
    });

    await Promise.all(drivers.map((driver) => ensureDriverRateCards(prisma, driver.id)));
    const refreshed = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      orderBy: { createdAt: "asc" },
      include: userInclude
    });

    return refreshed
      .filter((driver) => Boolean(driver.driverProfile))
      .map((driver) => mapDriverAccount(driver as UserWithDriver));
  },

  async listDriverApplications() {
    const drivers = await this.listDrivers();
    return drivers.filter((driver) => driver.approvalStatus === "pending");
  },

  async updateDriver(driverId, patch) {
    await getDriverUserOrThrow(driverId);

    const updated = await prisma.user.update({
      where: { id: driverId },
      data: {
        name: patch.name,
        driverProfile: {
          update: {
            available: patch.available,
            approvalStatus: patch.approvalStatus ? toDbDriverApprovalStatus(patch.approvalStatus) : undefined,
            approved:
              patch.approvalStatus === undefined
                ? undefined
                : patch.approvalStatus === "approved",
            homeState: patch.homeState?.toUpperCase() ?? patch.homeState,
            homeCity: patch.homeCity,
            pricingMode: patch.pricingMode ? toDbDriverPricingMode(patch.pricingMode) : undefined,
            localDispatchEnabled: patch.dispatchSettings?.localEnabled,
            localRadiusMiles: patch.dispatchSettings?.localRadiusMiles,
            serviceAreaDispatchEnabled: patch.dispatchSettings?.serviceAreaEnabled,
            serviceAreaStates: patch.dispatchSettings
              ? normalizeStateList(patch.dispatchSettings.serviceAreaStates)
              : undefined,
            nationwideDispatchEnabled: patch.dispatchSettings?.nationwideEnabled
          }
        }
      },
      include: userInclude
    });

    if (!updated.driverProfile) {
      throw new Error("Driver profile missing");
    }

    if (patch.approvalStatus && patch.approvalStatus !== "approved" && updated.driverProfile.available) {
      await prisma.driverProfile.update({
        where: { userId: driverId },
        data: { available: false }
      });
    }

    const refreshed = await prisma.user.findUniqueOrThrow({
      where: { id: driverId },
      include: userInclude
    });

    await ensureDriverRateCards(prisma, driverId);

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(refreshed)));
  },

  async setDriverAvailability(driverId, available) {
    if (available && (await this.driverHasOverdueDues(driverId))) {
      throw new Error("Driver has overdue platform dues and cannot go available");
    }

    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: { available }
    });

    const user = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    if (!user) {
      throw new Error("Driver not found");
    }

    return mapSessionUser(await ensureCommunityAccessToken(await ensureReferralCode(user)));
  },

  async findDueScheduledRides(releaseBefore) {
    const rides = await prisma.ride.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: {
          lte: releaseBefore
        }
      },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async getCommunityEligibility(user) {
    if (user.roles.includes("admin") || (user.roles.includes("driver") && user.approvalStatus === "approved")) {
      return {
        canRead: true,
        canCreateProposal: true,
        canVote: true,
        canComment: true,
        completedRideCount: user.roles.includes("rider")
          ? await prisma.ride.count({
              where: {
                riderId: user.id,
                status: "COMPLETED"
              }
            })
          : 0,
        threshold: COMMUNITY_COMPLETED_RIDE_THRESHOLD,
        reason: null
      } satisfies CommunityEligibility;
    }

    const completedRideCount = await prisma.ride.count({
      where: {
        riderId: user.id,
        status: "COMPLETED"
      }
    });
    const unlocked = completedRideCount >= COMMUNITY_COMPLETED_RIDE_THRESHOLD;

    return {
      canRead: true,
      canCreateProposal: unlocked,
      canVote: unlocked,
      canComment: unlocked,
      completedRideCount,
      threshold: COMMUNITY_COMPLETED_RIDE_THRESHOLD,
      reason: unlocked
        ? null
        : `Community voting unlocks after ${COMMUNITY_COMPLETED_RIDE_THRESHOLD} completed rides.`
    } satisfies CommunityEligibility;
  },

  async listCommunityProposals(viewerId) {
    const proposals = await prisma.communityProposal.findMany({
      where: {
        hidden: false
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return proposals.map((proposal) => mapCommunityProposal(proposal, viewerId));
  },

  async createCommunityProposal(authorId, input) {
    const proposal = await prisma.communityProposal.create({
      data: {
        authorId,
        title: input.title.trim(),
        body: input.body.trim()
      },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return mapCommunityProposal(proposal, authorId);
  },

  async getCommunityProposalById(proposalId, viewerId) {
    const proposal = await prisma.communityProposal.findUnique({
      where: { id: proposalId },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    if (!proposal || proposal.hidden) {
      return null;
    }

    return mapCommunityProposal(proposal, viewerId);
  },

  async voteOnCommunityProposal(proposalId, userId, choice) {
    await prisma.communityVote.upsert({
      where: {
        proposalId_userId: {
          proposalId,
          userId
        }
      },
      update: {
        choice: toDbCommunityVoteChoice(choice)
      },
      create: {
        proposalId,
        userId,
        choice: toDbCommunityVoteChoice(choice)
      }
    });

    const proposal = await prisma.communityProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return mapCommunityProposal(proposal, userId);
  },

  async listCommunityComments(proposalId) {
    const comments = await prisma.communityComment.findMany({
      where: {
        proposalId,
        hidden: false
      },
      orderBy: { createdAt: "asc" },
      include: {
        author: true
      }
    });

    return comments.map(mapCommunityComment);
  },

  async createCommunityComment(proposalId, authorId, input) {
    const comment = await prisma.communityComment.create({
      data: {
        proposalId,
        authorId,
        body: input.body.trim()
      },
      include: {
        author: true
      }
    });

    return mapCommunityComment(comment);
  },

  async updateCommunityProposal(proposalId, patch) {
    const proposal = await prisma.communityProposal.update({
      where: { id: proposalId },
      data: {
        pinned: patch.pinned,
        closed: patch.closed,
        hidden: patch.hidden
      },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return mapCommunityProposal(proposal, null);
  },

  async updateCommunityComment(commentId, patch) {
    const comment = await prisma.communityComment.update({
      where: { id: commentId },
      data: {
        hidden: patch.hidden
      },
      include: {
        author: true
      }
    });

    return mapCommunityComment(comment);
  },

  async addAuditLog(input) {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }
};
