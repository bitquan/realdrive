import bcrypt from "bcryptjs";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { Server } from "socket.io";
import type { SessionUser, ShareInfo } from "@shared/contracts";
import { z } from "zod";
import {
  adminLoginSchema,
  adminSetupInputSchema,
  adminUpdateCommunityCommentSchema,
  adminUpdateCommunityProposalSchema,
  adminUpdateDriverApprovalSchema,
  adminUpdateDriverSchema,
  adminUpdatePlatformDueSchema,
  adminUpdateRideSchema,
  authOtpRequestSchema,
  authOtpVerifySchema,
  communityAccessExchangeSchema,
  communityVoteInputSchema,
  createRideSchema,
  createCommunityCommentSchema,
  createCommunityProposalSchema,
  createDriverRoleSchema,
  driverDispatchSettingsUpdateSchema,
  driverInterestInputSchema,
  driverLocationSchema,
  driverLoginSchema,
  driverProfileUpdateSchema,
  driverRateCardUpdateSchema,
  driverSignupInputSchema,
  publicRideRequestSchema,
  riderLeadInputSchema,
  updatePlatformPayoutSettingsSchema,
  updatePlatformRatesSchema,
  updateRideStatusSchema
} from "@shared/contracts";
import { env } from "./config/env.js";
import { createPublicTrackingToken } from "./lib/codes.js";
import { normalizePhone } from "./lib/phone.js";
import { store } from "./lib/store.js";
import { createMapsService } from "./services/maps.js";
import { createOtpService } from "./services/otp.js";
import { calculateCustomerTotal, calculateFare, calculatePlatformDue, findPlatformPricingRule } from "./services/pricing.js";
import { createRideService } from "./services/ride-service.js";

function resolvePublicBaseUrl(request: FastifyRequest) {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : "";
  return env.publicBaseUrl || origin || env.clientOrigin;
}

function buildShareInfo(request: FastifyRequest, user: SessionUser | null): ShareInfo | null {
  if (!user?.referralCode) {
    return null;
  }

  return {
    referralCode: user.referralCode,
    shareUrl: `${resolvePublicBaseUrl(request)}/share/${user.referralCode}`,
    ownerName: user.name,
    ownerRole: user.role
  };
}

function buildCommunityAccessLink(request: FastifyRequest, token: string) {
  return {
    token,
    entryUrl: `${resolvePublicBaseUrl(request)}/community/join/${token}`
  };
}

function toSessionUser<T extends SessionUser & { passwordHash?: string | null }>(user: T): SessionUser {
  const { passwordHash: _passwordHash, ...sessionUser } = user;
  return sessionUser;
}

function hasRole(user: SessionUser, role: SessionUser["role"]) {
  return user.role === role || user.roles.includes(role);
}

function isOwnerDriver(user: SessionUser) {
  if (env.launchMode !== "solo_driver") {
    return true;
  }

  if (env.ownerDriverUserId && user.id === env.ownerDriverUserId) {
    return true;
  }

  if (env.ownerDriverPhone && user.phone === env.ownerDriverPhone) {
    return true;
  }

  return !env.ownerDriverUserId && !env.ownerDriverPhone;
}

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  const maps = createMapsService(env.mapboxToken);
  const otp = createOtpService();

  app.register(cors, {
    origin: true,
    credentials: false
  });
  app.register(sensible);
  app.register(jwt, {
    secret: env.jwtSecret
  });

  const io = new Server(app.server, {
    cors: {
      origin: true
    }
  });

  const rideService = createRideService({
    store,
    maps,
    events: {
      rideOffered(ride, driverIds) {
        for (const driverId of driverIds) {
          io.to(`user:${driverId}`).emit("ride.offer", ride);
        }
      },
      rideUpdated(ride) {
        io.to(`ride:${ride.id}`).emit("ride.status.changed", ride);
        io.to(`user:${ride.riderId}`).emit("ride.status.changed", ride);
        if (ride.driverId) {
          io.to(`user:${ride.driverId}`).emit("ride.status.changed", ride);
        }
      },
      rideLocationUpdated(ride) {
        io.to(`ride:${ride.id}`).emit("ride.location.updated", ride);
        io.to(`user:${ride.riderId}`).emit("ride.location.updated", ride);
        if (ride.driverId) {
          io.to(`user:${ride.driverId}`).emit("ride.location.updated", ride);
        }
      },
      driverAvailabilityChanged(driver) {
        io.emit("driver.availability.changed", driver);
      }
    }
  });

  app.decorate("io", io);
  app.decorate("services", {
    store,
    otp,
    maps,
    rideService
  });

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token ?? "");
      if (!token) {
        return next(new Error("Missing auth token"));
      }

      const payload = (await app.jwt.verify<{ sub: string }>(token)) as { sub: string };
      let user = await store.findSessionUserById(payload.sub);
      if (!user) {
        return next(new Error("User not found"));
      }

      if (!user.referralCode) {
        user = await store.ensureUserReferralCode(user.id);
      }

      socket.data.user = user;
      socket.join(`user:${user.id}`);
      for (const role of user.roles) {
        socket.join(`role:${role}`);
      }
      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string } | undefined;
    if (!user) {
      return;
    }

    socket.on("ride.watch", (rideId: string) => {
      socket.join(`ride:${rideId}`);
    });
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      const raw = request.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!raw) {
        return reply.unauthorized("Missing bearer token");
      }

      const payload = (await request.jwtVerify<{ sub: string }>()) as { sub: string };
      let user = await store.findSessionUserById(payload.sub);
      if (!user) {
        return reply.unauthorized("Invalid token");
      }

      if (!user.referralCode) {
        user = await store.ensureUserReferralCode(user.id);
      }

      request.userContext = user;
    } catch {
      return reply.unauthorized("Invalid token");
    }
  });

  function requireRole(...roles: Array<"rider" | "driver" | "admin">) {
    return async (request: Parameters<typeof app.authenticate>[0], reply: Parameters<typeof app.authenticate>[1]) => {
      await app.authenticate(request, reply);
      if (reply.sent) {
        return;
      }

      if (!roles.includes(request.userContext.role)) {
        const authorized = roles.some((role) => request.userContext.roles.includes(role));
        if (!authorized) {
          return reply.forbidden("You do not have access to this resource");
        }
      }

      if (roles.includes("driver") && hasRole(request.userContext, "driver") && request.userContext.approvalStatus !== "approved") {
        return reply.forbidden("Driver account is not approved");
      }
    };
  }

  function signToken(userId: string) {
    return app.jwt.sign({ sub: userId }, { expiresIn: "7d" });
  }

  function sendValidationError(reply: FastifyReply, details: unknown) {
    return reply.status(400).send({
      message: "Validation error",
      details
    });
  }

  function sendKnownOperationalError(reply: FastifyReply, error: unknown) {
    const message = error instanceof Error ? error.message : "Request failed";

    if (message.includes("overdue platform dues")) {
      return reply.forbidden(message);
    }

    return reply.status(400).send({ message });
  }

  app.get("/admin/setup/status", async () => {
    return store.getAdminSetupStatus();
  });

  app.post("/admin/setup", async (request, reply) => {
    const parsed = adminSetupInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      const admin = await store.setupAdmin({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        driverProfile: parsed.data.createDriverProfile && parsed.data.driverProfile
          ? {
              ...parsed.data.driverProfile,
              phone: normalizePhone(parsed.data.driverProfile.phone),
              homeState: parsed.data.driverProfile.homeState.toUpperCase()
            }
          : null
      });

      await store.addAuditLog({
        actorId: admin.id,
        action: "admin.setup.completed",
        entityType: "user",
        entityId: admin.id
      });

      return reply.status(201).send({
        token: signToken(admin.id),
        user: toSessionUser(admin)
      });
    } catch (error) {
      return reply.conflict((error as Error).message);
    }
  });

  app.post("/auth/otp/request", async (request, reply) => {
    const parsed = authOtpRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    if (parsed.data.role === "driver") {
      return reply.badRequest("Drivers must sign in with email and password");
    }

    const normalizedPhone = normalizePhone(parsed.data.phone);
    const result = await otp.requestCode(normalizedPhone);
    return reply.send(result);
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const parsed = authOtpVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    if (parsed.data.role === "driver") {
      return reply.badRequest("Drivers must sign in with email and password");
    }

    const normalizedPhone = normalizePhone(parsed.data.phone);
    const valid = await otp.verifyCode(normalizedPhone, parsed.data.code);
    if (!valid) {
      return reply.unauthorized("Invalid verification code");
    }

    const rider = (await store.findUserForOtp(normalizedPhone, "rider")) ??
      (await store.createRiderIdentity({
        phone: normalizedPhone,
        name: parsed.data.name ?? "Rider"
      }));

    return reply.send({
      token: signToken(rider.id),
      user: toSessionUser(rider)
    });
  });

  app.post("/driver/signup", async (request, reply) => {
    const parsed = driverSignupInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const driver = await store.createDriverAccount({
        ...parsed.data,
        email: parsed.data.email.toLowerCase(),
        phone: normalizePhone(parsed.data.phone),
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        homeState: parsed.data.homeState.toUpperCase()
      });

      await store.addAuditLog({
        actorId: driver.id,
        action: "driver.signup.created",
        entityType: "user",
        entityId: driver.id
      });

      return reply.status(201).send(driver);
    } catch (error) {
      return reply.conflict((error as Error).message);
    }
  });

  app.post("/driver/auth/login", async (request, reply) => {
    const parsed = driverLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const driver = await store.findDriverByEmail(parsed.data.email.toLowerCase());
    if (!driver?.passwordHash) {
      return reply.unauthorized("Invalid email or password");
    }

    const matches = await bcrypt.compare(parsed.data.password, driver.passwordHash);
    if (!matches) {
      return reply.unauthorized("Invalid email or password");
    }

    if (driver.approvalStatus !== "approved") {
      return reply.forbidden("Driver account is not approved");
    }

    return reply.send({
      token: signToken(driver.id),
      user: toSessionUser(driver)
    });
  });

  app.post("/driver/auth/logout", async (_request, reply) => {
    return reply.send({ ok: true });
  });

  app.post("/admin/auth/login", async (request, reply) => {
    const parsed = adminLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const admin = await store.findAdminByEmail(parsed.data.email.toLowerCase());
    if (!admin?.passwordHash) {
      return reply.unauthorized("Invalid email or password");
    }

    const matches = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!matches) {
      return reply.unauthorized("Invalid email or password");
    }

    return reply.send({
      token: signToken(admin.id),
      user: toSessionUser(admin)
    });
  });

  app.post("/auth/logout", async (_request, reply) => {
    return reply.send({ ok: true });
  });

  app.post("/quotes/ride", async (request, reply) => {
    const parsed = createRideSchema
      .pick({
        pickupAddress: true,
        dropoffAddress: true,
        rideType: true
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const route = await maps.estimateRoute(parsed.data.pickupAddress, parsed.data.dropoffAddress);
    const platformMarketKey = route.pickup.stateCode?.toUpperCase() ?? "DEFAULT";
    const pricingRules = await store.listPlatformPricingRules();
    const rule = findPlatformPricingRule(pricingRules, parsed.data.rideType, platformMarketKey);

    if (!rule) {
      return reply.badRequest("Missing platform pricing rule");
    }

    return reply.send({
      estimatedMiles: route.distanceMiles,
      estimatedMinutes: route.durationMinutes,
      routeProvider: route.provider,
      platformMarketKey,
      estimatedSubtotal: calculateFare(rule, route.distanceMiles, route.durationMinutes),
      estimatedPlatformDue: calculatePlatformDue(calculateFare(rule, route.distanceMiles, route.durationMinutes)),
      estimatedCustomerTotal: calculateCustomerTotal(calculateFare(rule, route.distanceMiles, route.durationMinutes))
    });
  });

  app.get("/public/drivers", async () => {
    const drivers = await store.listDrivers();
    return drivers.filter((driver) => driver.approved && isOwnerDriver(driver));
  });

  app.post("/public/rides", async (request, reply) => {
    const parsed = publicRideRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const referredByUser = parsed.data.referredByCode
      ? await store.findUserByReferralCode(parsed.data.referredByCode)
      : null;

    const rider = await store.createRiderIdentity({
      name: parsed.data.riderName,
      phone: normalizePhone(parsed.data.phone),
      email: parsed.data.email ?? null
    });

    const ride = await rideService.createRide(
      rider,
      {
        pickupAddress: parsed.data.pickupAddress,
        dropoffAddress: parsed.data.dropoffAddress,
        rideType: parsed.data.rideType,
        paymentMethod: parsed.data.paymentMethod,
        scheduledFor: parsed.data.scheduledFor
      },
      {
        publicTrackingToken: createPublicTrackingToken(),
        referredByUserId: referredByUser?.id ?? null,
        referredByCode: referredByUser?.referralCode ?? null
      }
    );

    const communityAccessToken = await store.ensureUserCommunityAccessToken(rider.id);

    return reply.send({
      ride,
      trackingUrl: `${resolvePublicBaseUrl(request)}/track/${ride.publicTrackingToken}`,
      share: buildShareInfo(request, rider),
      communityAccess: buildCommunityAccessLink(request, communityAccessToken)
    });
  });

  app.get("/public/track/:token", async (request, reply) => {
    const token = (request.params as { token: string }).token;
    const ride = await store.getRideByPublicTrackingToken(token);

    if (!ride) {
      return reply.notFound("Ride not found");
    }

    const rider = await store.findSessionUserById(ride.riderId);
    const communityAccessToken = rider ? await store.ensureUserCommunityAccessToken(rider.id) : null;
    return reply.send({
      ride,
      share: buildShareInfo(request, rider),
      communityAccess: communityAccessToken ? buildCommunityAccessLink(request, communityAccessToken) : null
    });
  });

  app.post("/public/rider-leads", async (request, reply) => {
    const parsed = riderLeadInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const referredByUser = parsed.data.referredByCode
      ? await store.findUserByReferralCode(parsed.data.referredByCode)
      : null;

    const rider = await store.createRiderIdentity({
      name: parsed.data.name,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      email: parsed.data.email
    });

    const lead = await store.createRiderLead({
      ...parsed.data,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : undefined,
      userId: rider.id,
      referredByUserId: referredByUser?.id ?? null,
      referredByCode: referredByUser?.referralCode ?? undefined
    });

    await store.addAuditLog({
      actorId: rider.id,
      action: "lead.rider.created",
      entityType: "riderLead",
      entityId: lead.id,
      metadata: {
        referredByCode: lead.referredByCode
      }
    });

    return reply.send({
      lead,
      share: buildShareInfo(request, rider)
    });
  });

  app.post("/public/driver-interest", async (request, reply) => {
    const parsed = driverInterestInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const interest = await store.createDriverInterest({
      ...parsed.data,
      phone: normalizePhone(parsed.data.phone)
    });

    await store.addAuditLog({
      action: "lead.driver-interest.created",
      entityType: "driverInterest",
      entityId: interest.id
    });

    return reply.status(201).send(interest);
  });

  app.get("/public/share/:referralCode", async (request) => {
    const referralCode = (request.params as { referralCode: string }).referralCode;
    const user = await store.findUserByReferralCode(referralCode);

    return {
      referralCode,
      destinationUrl: `${resolvePublicBaseUrl(request)}/?ref=${encodeURIComponent(referralCode)}`,
      ownerName: user?.name ?? null,
      ownerRole: user?.role ?? null
    };
  });

  app.get("/me", { preHandler: requireRole("rider", "driver", "admin") }, async (request) => {
    return request.userContext;
  });

  app.get("/me/share", { preHandler: requireRole("rider", "driver", "admin") }, async (request) => {
    const user = await store.ensureUserReferralCode(request.userContext.id);
    return buildShareInfo(request, user);
  });

  app.post("/me/roles/driver", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = createDriverRoleSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const user = request.userContext;
    if (user.roles.includes("driver")) {
      const existing = await store.getDriverAccount(user.id);
      if (!existing) {
        return reply.badRequest("Driver profile is missing");
      }
      return reply.send(existing);
    }

    const driver = await store.createDriverRole(user.id, {
      ...parsed.data,
      phone: normalizePhone(parsed.data.phone),
      homeState: parsed.data.homeState.toUpperCase()
    });

    await store.addAuditLog({
      actorId: user.id,
      action: "driver.role.created",
      entityType: "user",
      entityId: user.id
    });

    return reply.status(201).send(driver);
  });

  app.post("/rides", { preHandler: requireRole("rider") }, async (request, reply) => {
    const parsed = createRideSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const ride = await rideService.createRide(request.userContext, parsed.data);
    return reply.send(ride);
  });

  app.get("/rides/:id", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const rideId = (request.params as { id: string }).id;
    const ride = await store.getRideById(rideId);
    if (!ride) {
      return reply.notFound("Ride not found");
    }

    const user = request.userContext;
    if (!hasRole(user, "admin") && ride.riderId !== user.id && ride.driverId !== user.id) {
      return reply.forbidden("You do not have access to this ride");
    }

    return ride;
  });

  app.post("/rides/:id/cancel", { preHandler: requireRole("rider", "admin") }, async (request, reply) => {
    const rideId = (request.params as { id: string }).id;
    const ride = await rideService.cancelRide(rideId, request.userContext);
    return reply.send(ride);
  });

  app.get("/rider/rides", { preHandler: requireRole("rider") }, async (request) => {
    return store.listRiderRides(request.userContext.id);
  });

  app.get("/driver/profile", { preHandler: requireRole("driver") }, async (request, reply) => {
    const driver = await store.getDriverAccount(request.userContext.id);
    if (!driver) {
      return reply.notFound("Driver not found");
    }

    return driver;
  });

  app.patch("/driver/profile", { preHandler: requireRole("driver") }, async (request, reply) => {
    const parsed = driverProfileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const driver = await store.updateDriverProfile(request.userContext.id, {
      ...parsed.data,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : undefined,
      homeState: parsed.data.homeState?.toUpperCase()
    });

    return reply.send(driver);
  });

  app.get("/driver/dispatch-settings", { preHandler: requireRole("driver") }, async (request) => {
    return store.getDriverDispatchSettings(request.userContext.id);
  });

  app.put("/driver/dispatch-settings", { preHandler: requireRole("driver") }, async (request, reply) => {
    const parsed = driverDispatchSettingsUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    return reply.send(
      await store.updateDriverDispatchSettings(request.userContext.id, {
        ...parsed.data,
        serviceAreaStates: parsed.data.serviceAreaStates.map((state) => state.toUpperCase())
      })
    );
  });

  app.get("/driver/rates", { preHandler: requireRole("driver") }, async (request) => {
    return store.getDriverRateCard(request.userContext.id);
  });

  app.put("/driver/rates", { preHandler: requireRole("driver") }, async (request, reply) => {
    const parsed = driverRateCardUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const rateCard = await store.replaceDriverRateCard(request.userContext.id, parsed.data);
    return reply.send(rateCard);
  });

  app.get("/driver/dues", { preHandler: requireRole("driver") }, async (request) => {
    const dues = await store.listDriverDues(request.userContext.id);
    const payoutSettings = await store.getPlatformPayoutSettings();
    const outstanding = dues.filter((due) => due.status === "pending" || due.status === "overdue");
    const history = dues.filter((due) => due.status === "paid" || due.status === "waived");

    return {
      outstanding,
      history,
      payoutSettings,
      suspended: dues.some((due) => due.status === "overdue"),
      overdueCount: dues.filter((due) => due.status === "overdue").length,
      outstandingTotal: Number(outstanding.reduce((total, due) => total + due.amount, 0).toFixed(2))
    };
  });

  app.get("/driver/offers", { preHandler: requireRole("driver") }, async (request) => {
    return store.listDriverOffers(request.userContext.id);
  });

  app.post("/driver/offers/:rideId/accept", { preHandler: requireRole("driver") }, async (request, reply) => {
    const rideId = (request.params as { rideId: string }).rideId;
    try {
      const ride = await rideService.acceptRideOffer(rideId, request.userContext.id);
      return reply.send(ride);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.post("/driver/offers/:rideId/decline", { preHandler: requireRole("driver") }, async (request, reply) => {
    const rideId = (request.params as { rideId: string }).rideId;
    const ride = await rideService.declineRideOffer(rideId, request.userContext.id);
    return reply.send(ride);
  });

  app.post("/driver/location", { preHandler: requireRole("driver") }, async (request, reply) => {
    const parsed = driverLocationSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const ride = await rideService.recordDriverLocation(request.userContext.id, parsed.data);
    return reply.send(ride);
  });

  app.post("/driver/rides/:id/status", { preHandler: requireRole("driver") }, async (request, reply) => {
    const parsed = updateRideStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const id = (request.params as { id: string }).id;
    const ride = await rideService.updateRideStatus(id, request.userContext.id, parsed.data.status);
    return reply.send(ride);
  });

  app.post("/driver/availability", { preHandler: requireRole("driver") }, async (request, reply) => {
    const parsed = z.object({ available: z.boolean() }).safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const driver = await store.setDriverAvailability(request.userContext.id, parsed.data.available);
      io.emit("driver.availability.changed", driver);
      return reply.send(driver);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.get("/driver/rides/active", { preHandler: requireRole("driver") }, async (request) => {
    return store.listActiveDriverRides(request.userContext.id);
  });

  app.get("/admin/rides", { preHandler: requireRole("admin") }, async () => {
    return store.listAdminRides();
  });

  app.get("/admin/dues", { preHandler: requireRole("admin") }, async () => {
    const dues = await store.listAllPlatformDues();
    const payoutSettings = await store.getPlatformPayoutSettings();
    const overdueDrivers = Object.values(
      dues
        .filter((due) => due.status === "overdue")
        .reduce<Record<string, { driverId: string; name: string; email: string | null; phone: string | null; overdueAmount: number; overdueCount: number }>>(
          (accumulator, due) => {
            accumulator[due.driverId] ??= {
              driverId: due.driverId,
              name: due.driver.name,
              email: due.driver.email,
              phone: due.driver.phone,
              overdueAmount: 0,
              overdueCount: 0
            };

            accumulator[due.driverId].overdueAmount = Number(
              (accumulator[due.driverId].overdueAmount + due.amount).toFixed(2)
            );
            accumulator[due.driverId].overdueCount += 1;
            return accumulator;
          },
          {}
        )
    );

    return {
      dues,
      payoutSettings,
      overdueDrivers
    };
  });

  app.patch("/admin/dues/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdatePlatformDueSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const due = await store.updatePlatformDue((request.params as { id: string }).id, {
      ...parsed.data,
      resolvedById: request.userContext.id
    });

    await store.addAuditLog({
      actorId: request.userContext.id,
      action: "platformDue.updated",
      entityType: "platformDue",
      entityId: due.id,
      metadata: parsed.data
    });

    return reply.send(due);
  });

  app.get("/admin/platform-payout-settings", { preHandler: requireRole("admin") }, async () => {
    return store.getPlatformPayoutSettings();
  });

  app.put("/admin/platform-payout-settings", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = updatePlatformPayoutSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const settings = await store.updatePlatformPayoutSettings(parsed.data);
    return reply.send(settings);
  });

  app.get("/admin/leads", { preHandler: requireRole("admin") }, async () => {
    const [riderLeads, driverInterests] = await Promise.all([
      store.listRiderLeads(),
      store.listDriverInterests()
    ]);

    return {
      riderLeads,
      driverInterests
    };
  });

  app.patch("/admin/rides/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdateRideSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const ride = await rideService.updateRideFromAdmin(
      (request.params as { id: string }).id,
      request.userContext.id,
      parsed.data
    );

    return reply.send(ride);
  });

  app.get("/admin/driver-applications", { preHandler: requireRole("admin") }, async () => {
    return store.listDriverApplications();
  });

  app.patch("/admin/drivers/:id/approval", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdateDriverApprovalSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const driver = await store.updateDriver((request.params as { id: string }).id, {
      approvalStatus: parsed.data.approvalStatus
    });
    io.emit("driver.availability.changed", driver);
    return reply.send(driver);
  });

  app.get("/admin/drivers", { preHandler: requireRole("admin") }, async () => {
    return store.listDrivers();
  });

  app.patch("/admin/drivers/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdateDriverSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const driver = await store.updateDriver((request.params as { id: string }).id, parsed.data);
    io.emit("driver.availability.changed", driver);
    return reply.send(driver);
  });

  app.get("/admin/platform-rates", { preHandler: requireRole("admin") }, async () => {
    return store.listPlatformPricingRules();
  });

  app.put("/admin/platform-rates", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = updatePlatformRatesSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const rules = await store.replacePlatformPricingRules({
      rules: parsed.data.rules
    }.rules);
    return reply.send(rules);
  });

  app.get("/admin/pricing", { preHandler: requireRole("admin") }, async () => {
    return store.listPlatformPricingRules();
  });

  app.put("/admin/pricing", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = updatePlatformRatesSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const rules = await store.replacePlatformPricingRules(parsed.data.rules);
    return reply.send(rules);
  });

  app.post("/community/access/exchange", async (request, reply) => {
    const parsed = communityAccessExchangeSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const user = await store.findUserByCommunityAccessToken(parsed.data.token);
    if (!user) {
      return reply.notFound("Community access token not found");
    }

    return reply.send({
      token: signToken(user.id),
      user
    });
  });

  app.get("/community/proposals", { preHandler: requireRole("rider", "driver", "admin") }, async (request) => {
    const [eligibility, proposals] = await Promise.all([
      store.getCommunityEligibility(request.userContext),
      store.listCommunityProposals(request.userContext.id)
    ]);

    return {
      proposals,
      eligibility
    };
  });

  app.post("/community/proposals", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = createCommunityProposalSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const eligibility = await store.getCommunityEligibility(request.userContext);
    if (!eligibility.canCreateProposal) {
      return reply.forbidden(eligibility.reason ?? "Community proposal creation is locked");
    }

    const proposal = await store.createCommunityProposal(request.userContext.id, parsed.data);
    await store.addAuditLog({
      actorId: request.userContext.id,
      action: "community.proposal.created",
      entityType: "communityProposal",
      entityId: proposal.id
    });

    return reply.status(201).send(proposal);
  });

  app.post("/community/proposals/:id/vote", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = communityVoteInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const eligibility = await store.getCommunityEligibility(request.userContext);
    if (!eligibility.canVote) {
      return reply.forbidden(eligibility.reason ?? "Community voting is locked");
    }

    const proposal = await store.getCommunityProposalById((request.params as { id: string }).id, request.userContext.id);
    if (!proposal) {
      return reply.notFound("Proposal not found");
    }
    if (proposal.closed) {
      return reply.badRequest("Voting is closed for this proposal");
    }

    return reply.send(
      await store.voteOnCommunityProposal((request.params as { id: string }).id, request.userContext.id, parsed.data.choice)
    );
  });

  app.get("/community/proposals/:id/comments", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const proposal = await store.getCommunityProposalById((request.params as { id: string }).id, request.userContext.id);
    if (!proposal) {
      return reply.notFound("Proposal not found");
    }

    return {
      proposal,
      comments: await store.listCommunityComments((request.params as { id: string }).id),
      eligibility: await store.getCommunityEligibility(request.userContext)
    };
  });

  app.post("/community/proposals/:id/comments", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = createCommunityCommentSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const eligibility = await store.getCommunityEligibility(request.userContext);
    if (!eligibility.canComment) {
      return reply.forbidden(eligibility.reason ?? "Community comments are locked");
    }

    const proposal = await store.getCommunityProposalById((request.params as { id: string }).id, request.userContext.id);
    if (!proposal) {
      return reply.notFound("Proposal not found");
    }
    if (proposal.closed) {
      return reply.badRequest("Comments are closed for this proposal");
    }

    const comment = await store.createCommunityComment((request.params as { id: string }).id, request.userContext.id, parsed.data);
    await store.addAuditLog({
      actorId: request.userContext.id,
      action: "community.comment.created",
      entityType: "communityComment",
      entityId: comment.id
    });

    return reply.status(201).send(comment);
  });

  app.patch("/admin/community/proposals/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdateCommunityProposalSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    return reply.send(await store.updateCommunityProposal((request.params as { id: string }).id, parsed.data));
  });

  app.patch("/admin/community/comments/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdateCommunityCommentSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    return reply.send(await store.updateCommunityComment((request.params as { id: string }).id, parsed.data));
  });

  return app;
}
