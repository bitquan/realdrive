import { createReadStream } from "node:fs";
import bcrypt from "bcryptjs";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { Server } from "socket.io";
import type { SessionUser, ShareInfo } from "@shared/contracts";
import { z } from "zod";
import {
  acceptAdminInviteSchema,
  adminLoginSchema,
  adminReviewDriverDocumentSchema,
  adminSetupInputSchema,
  adminReconcilePlatformDueBatchSchema,
  adminTransferDriverCollectorSchema,
  adminUpdatePlatformDueBatchSchema,
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
  createAdminInviteSchema,
  createIssueReportSchema,
  createDriverRoleSchema,
  driverDispatchSettingsUpdateSchema,
  driverIdleLocationSchema,
  driverInterestInputSchema,
  driverLocationSchema,
  driverLoginSchema,
  driverProfileUpdateSchema,
  driverRateCardUpdateSchema,
  driverSignupInputSchema,
  publicRideRequestSchema,
  riderLeadInputSchema,
  removePushSubscriptionSchema,
  updateNotificationPreferenceSchema,
  updatePlatformRateBenchmarksSchema,
  updatePlatformPayoutSettingsSchema,
  updatePlatformRatesSchema,
  updateRideStatusSchema,
  upsertPushSubscriptionSchema
} from "@shared/contracts";
import { env } from "./config/env.js";
import { createPublicTrackingToken } from "./lib/codes.js";
import { normalizePhone } from "./lib/phone.js";
import { store } from "./lib/store.js";
import { createMapsService } from "./services/maps.js";
import {
  createGitHubIssueForReport,
  sanitizeIssueDetails,
  sanitizeIssueMetadata,
  sanitizeIssuePage,
  sanitizeIssueSummary
} from "./services/issue-reports.js";
import { createOtpService } from "./services/otp.js";
import { calculateCustomerTotal, calculateFare, calculatePlatformDue, findPlatformPricingRule } from "./services/pricing.js";
import { createPushService } from "./services/push.js";
import { createRideService } from "./services/ride-service.js";
import { createSmsService } from "./services/sms.js";
import { applyAutoPlatformRates as runAutoPlatformRates } from "./services/platform-rate-auto-runner.js";
import { createStripeCheckoutLink } from "./services/payments.js";

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
    logger: true,
    bodyLimit: 20 * 1024 * 1024
  });

  const maps = createMapsService(env.mapboxToken);
  const otp = createOtpService();
  const sms = createSmsService();
  const push = createPushService();
  const autoApplyIntervalMinutes = Math.max(1, Math.floor(env.platformRateAutoApplyMinutes));
  const autoApplyRunnerMode = env.platformRateAutoApplyRunner === "worker" ? "worker" : "api";
  const undercutAmount = Math.max(0, Number(env.platformRateUndercutAmount.toFixed(2)));

  const autoRateState: {
    lastRunAt: string | null;
    lastAppliedRuleCount: number;
    lastError: string | null;
  } = {
    lastRunAt: null,
    lastAppliedRuleCount: 0,
    lastError: null
  };

  async function applyAutoPlatformRates(trigger: "manual" | "scheduled" | "startup") {
    const result = await runAutoPlatformRates(store, trigger);
    autoRateState.lastRunAt = result.runAt;
    autoRateState.lastAppliedRuleCount = result.appliedRuleCount;
    autoRateState.lastError = null;
    return result;
  }

  app.register(cors, {
    origin: true,
    credentials: false
  });
  app.register(sensible);
  app.register(jwt, {
    secret: env.jwtSecret
  });

  let autoApplyInterval: NodeJS.Timeout | null = null;
  if (env.platformRateAutoApplyEnabled && autoApplyRunnerMode === "api") {
    const runScheduled = async (trigger: "scheduled" | "startup") => {
      try {
        await applyAutoPlatformRates(trigger);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Auto platform-rate apply failed";
        autoRateState.lastError = message;
        app.log.error({ error }, "Auto platform-rate apply failed");
      }
    };

    void runScheduled("startup");
    autoApplyInterval = setInterval(() => {
      void runScheduled("scheduled");
    }, autoApplyIntervalMinutes * 60 * 1000);
  }

  app.addHook("onClose", async () => {
    if (autoApplyInterval) {
      clearInterval(autoApplyInterval);
      autoApplyInterval = null;
    }
  });

  const io = new Server(app.server, {
    cors: {
      origin: true
    }
  });

  app.get("/", async () => {
    return {
      ok: true,
      service: "realdrive-api"
    };
  });

  app.get("/health", async () => {
    return {
      ok: true
    };
  });

  app.get("/public/push/config", async () => {
    return {
      enabled: push.isEnabled(),
      vapidPublicKey: push.publicVapidKey() || null
    };
  });

  function resolveOptionalUserIdFromAuthHeader(request: FastifyRequest): string | null {
    const authHeader = typeof request.headers.authorization === "string" ? request.headers.authorization : "";
    if (!authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return null;
    }

    try {
      const payload = app.jwt.verify<{ sub?: string }>(token);
      return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
  }

  async function logPushSkipped(userId: string, rideId: string | null, eventKey: string, reason: string) {
    await store.logNotificationDelivery({
      userId,
      rideId,
      channel: "push",
      eventKey,
      status: "skipped",
      errorCode: reason,
      metadata: { reason }
    });
  }

  async function sendPushForUser(input: {
    userId: string;
    rideId: string | null;
    eventKey: string;
    title: string;
    body: string;
    url: string;
  }) {
    const preference = await store.getNotificationPreference(input.userId);
    if (!preference.pushEnabled) {
      await logPushSkipped(input.userId, input.rideId, input.eventKey, "user_push_disabled");
      return { sentCount: 0, failedCount: 0, pushEnabled: false };
    }

    if (!push.isEnabled()) {
      await logPushSkipped(input.userId, input.rideId, input.eventKey, "server_push_not_configured");
      return { sentCount: 0, failedCount: 0, pushEnabled: true };
    }

    const subscriptions = await store.listPushSubscriptions(input.userId);
    if (!subscriptions.length) {
      await logPushSkipped(input.userId, input.rideId, input.eventKey, "no_active_subscription");
      return { sentCount: 0, failedCount: 0, pushEnabled: true };
    }

    const result = await push.sendToSubscriptions(
      subscriptions.map((subscription) => ({
        endpoint: subscription.endpoint,
        keys: subscription.keys
      })),
      {
        title: input.title,
        body: input.body,
        url: input.url,
        tag: `ride:${input.rideId ?? "general"}:${input.eventKey}`,
        metadata: {
          eventKey: input.eventKey,
          rideId: input.rideId
        }
      }
    );

    if (result.sentCount > 0) {
      await store.logNotificationDelivery({
        userId: input.userId,
        rideId: input.rideId,
        channel: "push",
        eventKey: input.eventKey,
        status: "sent",
        metadata: {
          sentCount: result.sentCount
        }
      });
    }

    for (const failed of result.failed) {
      await store.logNotificationDelivery({
        userId: input.userId,
        rideId: input.rideId,
        channel: "push",
        eventKey: input.eventKey,
        status: "failed",
        errorCode: failed.code,
        errorText: failed.message,
        metadata: {
          endpoint: failed.endpoint
        }
      });

      if (failed.removeSubscription) {
        await store.removePushSubscription(input.userId, failed.endpoint);
      }
    }

    return {
      sentCount: result.sentCount,
      failedCount: result.failed.length,
      pushEnabled: true
    };
  }

  async function sendCriticalSmsFallback(input: {
    userId: string;
    rideId: string | null;
    eventKey: string;
    phone: string | null;
    sendSms: () => Promise<void>;
    pushSentCount: number;
    pushFailedCount: number;
  }) {
    const preference = await store.getNotificationPreference(input.userId);
    if (!preference.smsCriticalOnly) {
      await store.logNotificationDelivery({
        userId: input.userId,
        rideId: input.rideId,
        channel: "sms",
        eventKey: input.eventKey,
        status: "skipped",
        errorCode: "user_sms_disabled",
        metadata: { reason: "user_sms_disabled" }
      });
      return;
    }

    const shouldFallback = input.pushSentCount === 0 || input.pushFailedCount > 0;
    if (!shouldFallback) {
      await store.logNotificationDelivery({
        userId: input.userId,
        rideId: input.rideId,
        channel: "sms",
        eventKey: input.eventKey,
        status: "skipped",
        errorCode: "push_success",
        metadata: { reason: "push_success" }
      });
      return;
    }

    if (!input.phone) {
      await store.logNotificationDelivery({
        userId: input.userId,
        rideId: input.rideId,
        channel: "sms",
        eventKey: input.eventKey,
        status: "skipped",
        errorCode: "missing_phone",
        metadata: { reason: "missing_phone" }
      });
      return;
    }

    try {
      await input.sendSms();
      await store.logNotificationDelivery({
        userId: input.userId,
        rideId: input.rideId,
        channel: "sms",
        eventKey: input.eventKey,
        status: "sent"
      });
    } catch (error) {
      await store.logNotificationDelivery({
        userId: input.userId,
        rideId: input.rideId,
        channel: "sms",
        eventKey: input.eventKey,
        status: "failed",
        errorText: error instanceof Error ? error.message : "sms_failed"
      });
    }
  }

  const rideService = createRideService({
    store,
    maps,
    events: {
      rideOffered(ride, driverIds) {
        for (const driverId of driverIds) {
          io.to(`user:${driverId}`).emit("ride.offer", ride);
        }

        void Promise.all(
          driverIds.map(async (driverId) => {
            try {
              const driver = await store.getDriverAccount(driverId);
              if (!driver) {
                return;
              }

              const pushResult = await sendPushForUser({
                userId: driverId,
                rideId: ride.id,
                eventKey: "new_job",
                title: "New job available",
                body: `Ride near ${ride.pickup.address}. Open RealDrive to accept.`,
                url: `/driver/rides/${ride.id}`
              });

              await sendCriticalSmsFallback({
                userId: driverId,
                rideId: ride.id,
                eventKey: "new_job",
                phone: driver.phone ?? null,
                pushSentCount: pushResult.sentCount,
                pushFailedCount: pushResult.failedCount,
                sendSms: () => sms.notifyDriverNewRide(driver.phone ?? "", ride)
              });
            } catch (err) {
              app.log.warn({ err, driverId }, "Driver notification flow failed");
            }
          })
        );
      },
      rideUpdated(ride) {
        io.to(`ride:${ride.id}`).emit("ride.status.changed", ride);
        io.to(`user:${ride.riderId}`).emit("ride.status.changed", ride);
        if (ride.driverId) {
          io.to(`user:${ride.driverId}`).emit("ride.status.changed", ride);
        }

        // SMS notifications based on status transition
        const riderPhone = ride.rider?.phone ?? null;
        const driverPhone = ride.driver?.phone ?? null;

        const riderTrackUrl = ride.publicTrackingToken ? `/track/${ride.publicTrackingToken}` : `/rider/rides/${ride.id}`;
        const driverRideUrl = `/driver/rides/${ride.id}`;

        if (ride.status === "offered") {
          // Driver-side notifications are sent per-driver in rideOffered — see below.
        } else if (ride.status === "accepted") {
          void (async () => {
            const pushResult = await sendPushForUser({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "accepted",
              title: "Driver accepted your ride",
              body: `${ride.driver?.name ?? "Your driver"} is on the way.`,
              url: riderTrackUrl
            });
            await sendCriticalSmsFallback({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "accepted",
              phone: riderPhone,
              pushSentCount: pushResult.sentCount,
              pushFailedCount: pushResult.failedCount,
              sendSms: () => sms.notifyRiderDriverAccepted(riderPhone ?? "", ride)
            });
          })();
        } else if (ride.status === "en_route") {
          void sendPushForUser({
            userId: ride.riderId,
            rideId: ride.id,
            eventKey: "en_route",
            title: "Driver en route",
            body: `${ride.driver?.name ?? "Your driver"} is heading to pickup.`,
            url: riderTrackUrl
          });
        } else if (ride.status === "arrived") {
          void (async () => {
            const pushResult = await sendPushForUser({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "arrived",
              title: "Driver arrived",
              body: `${ride.driver?.name ?? "Your driver"} has arrived at pickup.`,
              url: riderTrackUrl
            });
            await sendCriticalSmsFallback({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "arrived",
              phone: riderPhone,
              pushSentCount: pushResult.sentCount,
              pushFailedCount: pushResult.failedCount,
              sendSms: () => sms.notifyRiderDriverArrived(riderPhone ?? "", ride)
            });
          })();
        } else if (ride.status === "in_progress") {
          void (async () => {
            const pushResult = await sendPushForUser({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "in_progress",
              title: "Ride in progress",
              body: "Your trip has started.",
              url: riderTrackUrl
            });
            await sendCriticalSmsFallback({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "in_progress",
              phone: riderPhone,
              pushSentCount: pushResult.sentCount,
              pushFailedCount: pushResult.failedCount,
              sendSms: () => sms.notifyRiderRideStarted(riderPhone ?? "", ride)
            });
          })();
        } else if (ride.status === "completed") {
          void Promise.all([
            sendPushForUser({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "completed",
              title: "Ride completed",
              body: "Your trip is complete. Thanks for riding with RealDrive.",
              url: riderTrackUrl
            }),
            ride.driverId
              ? sendPushForUser({
                  userId: ride.driverId,
                  rideId: ride.id,
                  eventKey: "completed",
                  title: "Ride completed",
                  body: "Trip completed. Earnings and dues are updated.",
                  url: driverRideUrl
                })
              : Promise.resolve({ sentCount: 0, failedCount: 0, pushEnabled: true })
          ]).then(async ([riderPush, driverPush]) => {
            await sendCriticalSmsFallback({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "completed",
              phone: riderPhone,
              pushSentCount: riderPush.sentCount,
              pushFailedCount: riderPush.failedCount,
              sendSms: () => sms.notifyRiderRideComplete(riderPhone ?? "", ride)
            });

            if (ride.driverId) {
              await sendCriticalSmsFallback({
                userId: ride.driverId,
                rideId: ride.id,
                eventKey: "completed",
                phone: driverPhone,
                pushSentCount: driverPush.sentCount,
                pushFailedCount: driverPush.failedCount,
                sendSms: () => sms.notifyDriverRideComplete(driverPhone ?? "", ride)
              });
            }
          });
        } else if (ride.status === "canceled") {
          void Promise.all([
            sendPushForUser({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "canceled",
              title: "Ride canceled",
              body: "Your ride was canceled.",
              url: riderTrackUrl
            }),
            ride.driverId
              ? sendPushForUser({
                  userId: ride.driverId,
                  rideId: ride.id,
                  eventKey: "canceled",
                  title: "Ride canceled",
                  body: "This ride has been canceled.",
                  url: driverRideUrl
                })
              : Promise.resolve({ sentCount: 0, failedCount: 0, pushEnabled: true })
          ]).then(async ([riderPush, driverPush]) => {
            await sendCriticalSmsFallback({
              userId: ride.riderId,
              rideId: ride.id,
              eventKey: "canceled",
              phone: riderPhone,
              pushSentCount: riderPush.sentCount,
              pushFailedCount: riderPush.failedCount,
              sendSms: () => sms.notifyRiderCanceled(riderPhone ?? "", ride)
            });

            if (ride.driverId) {
              await sendCriticalSmsFallback({
                userId: ride.driverId,
                rideId: ride.id,
                eventKey: "canceled",
                phone: driverPhone,
                pushSentCount: driverPush.sentCount,
                pushFailedCount: driverPush.failedCount,
                sendSms: () => sms.notifyDriverCanceled(driverPhone ?? "", ride)
              });
            }
          });
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

  app.post("/admin/invite/accept", async (request, reply) => {
    const parsed = acceptAdminInviteSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      const admin = await store.acceptAdminInvite({
        ...parsed.data,
        email: parsed.data.email.toLowerCase(),
        passwordHash
      });

      await store.addAuditLog({
        actorId: admin.id,
        action: "admin.invite.accepted",
        entityType: "user",
        entityId: admin.id
      });

      return reply.status(201).send({
        token: signToken(admin.id),
        user: toSessionUser(admin)
      });
    } catch (error) {
      return sendKnownOperationalError(reply, error);
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
      const message = error instanceof Error ? error.message : "Request failed";
      if (message.includes("already exists")) {
        return reply.conflict(message);
      }

      return sendKnownOperationalError(reply, error);
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

  app.get("/public/address-suggestions", async (request, reply) => {
    const parsed = z
      .object({
        q: z.string().min(3)
      })
      .safeParse(request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const suggestions = await maps.autocompleteAddress(parsed.data.q);
    return reply.send(suggestions);
  });

  app.get("/public/drivers", async () => {
    const drivers = await store.listDrivers();
    return drivers.filter((driver) => driver.approved && isOwnerDriver(driver));
  });

  app.post("/public/analytics/heartbeat", async (request, reply) => {
    const parsed = z
      .object({
        sessionId: z.string().min(8).max(120),
        path: z.string().min(1).max(500).optional(),
        referrer: z.string().max(500).optional()
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const userAgent = typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null;
    const userId = resolveOptionalUserIdFromAuthHeader(request);

    await store.trackSiteHeartbeat({
      sessionId: parsed.data.sessionId,
      path: parsed.data.path,
      referrer: parsed.data.referrer,
      userAgent,
      userId
    });

    return reply.status(202).send({ ok: true });
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

    try {
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
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
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

  app.get("/me/notification-preferences", { preHandler: requireRole("rider", "driver", "admin") }, async (request) => {
    const [preferences, subscriptions] = await Promise.all([
      store.getNotificationPreference(request.userContext.id),
      store.listPushSubscriptions(request.userContext.id)
    ]);

    return {
      preferences,
      subscriptionCount: subscriptions.length,
      subscriptions
    };
  });

  app.put("/me/notification-preferences", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = updateNotificationPreferenceSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const preferences = await store.updateNotificationPreference(request.userContext.id, parsed.data);
    return reply.send({ preferences });
  });

  app.post("/me/push-subscriptions", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = upsertPushSubscriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    await store.upsertPushSubscription(request.userContext.id, parsed.data);
    const subscriptions = await store.listPushSubscriptions(request.userContext.id);
    return reply.status(201).send({
      ok: true,
      subscriptionCount: subscriptions.length,
      subscriptions
    });
  });

  app.post("/me/push-subscriptions/unsubscribe", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = removePushSubscriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    await store.removePushSubscription(request.userContext.id, parsed.data.endpoint);
    const subscriptions = await store.listPushSubscriptions(request.userContext.id);
    return reply.send({
      ok: true,
      subscriptionCount: subscriptions.length,
      subscriptions
    });
  });

  app.post("/me/notifications/test-push", { preHandler: requireRole("rider", "driver", "admin") }, async (request) => {
    const pushResult = await sendPushForUser({
      userId: request.userContext.id,
      rideId: null,
      eventKey: "manual_test",
      title: "RealDrive test notification",
      body: "Push is connected for this device.",
      url: "/notifications"
    });

    return {
      ok: true,
      push: {
        sentCount: pushResult.sentCount,
        failedCount: pushResult.failedCount,
        pushEnabled: pushResult.pushEnabled
      }
    };
  });

  app.get("/me/notification-delivery-logs", { preHandler: requireRole("rider", "driver", "admin") }, async (request) => {
    const limit = Number((request.query as { limit?: string }).limit ?? "20");
    const logs = await store.listNotificationDeliveryLogs(request.userContext.id, Number.isFinite(limit) ? limit : 20);
    return {
      logs
    };
  });

  // Roadmap endpoints
  app.get("/roadmap", { preHandler: requireRole("rider", "driver", "admin") }, async (request) => {
    const { getRoadmapFeatures } = await import("./data/roadmap-features.js");
    const features = getRoadmapFeatures(true); // publicOnly=true, hides deferred
    
    const votes = await Promise.all(
      features.map(async (feature) => ({
        featureId: feature.id,
        count: await store.getFeatureVoteCount(feature.id),
        userVoted: await store.hasUserVotedForFeature(request.userContext.id, feature.id)
      }))
    );
    
    const voteMap = new Map(votes.map(v => [v.featureId, v]));
    
    const featuresWithVotes = features.map(f => ({
      ...f,
      voteCount: voteMap.get(f.id)?.count ?? 0,
      userVoted: voteMap.get(f.id)?.userVoted ?? false
    }));

    return {
      features: featuresWithVotes,
      totalVotes: votes.reduce((sum, v) => sum + v.count, 0)
    };
  });

  app.post(
    "/me/roadmap/vote/:featureId",
    { preHandler: requireRole("rider", "driver", "admin") },
    async (request, reply) => {
      const { featureId } = request.params as { featureId: string };
      const { vote } = request.body as { vote: boolean };

      if (typeof vote !== "boolean") {
        return reply.badRequest("vote must be true or false");
      }

      if (vote) {
        await store.createRoadmapFeatureVote(request.userContext.id, featureId);
      } else {
        await store.removeRoadmapFeatureVote(request.userContext.id, featureId);
      }

      const voteCount = await store.getFeatureVoteCount(featureId);
      const userVoted = await store.hasUserVotedForFeature(request.userContext.id, featureId);

      return {
        featureId,
        voteCount,
        userVoted
      };
    }
  );

  app.get("/admin/data/activity", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = z
      .object({
        windowMinutes: z.coerce.number().int().min(1).max(24 * 60).default(30)
      })
      .safeParse(request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const overview = await store.getAdminActivityOverview(parsed.data.windowMinutes);
    return reply.send(overview);
  });

  app.post("/issues/report", { preHandler: requireRole("rider", "driver", "admin") }, async (request, reply) => {
    const parsed = createIssueReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const user = request.userContext;
    if (parsed.data.rideId) {
      const ride = await store.getRideById(parsed.data.rideId);
      if (!ride) {
        return reply.notFound("Ride not found");
      }

      if (!hasRole(user, "admin") && ride.riderId !== user.id && ride.driverId !== user.id) {
        return reply.forbidden("You do not have access to this ride");
      }
    }

    const report = await store.createIssueReport({
      reporterId: user.id,
      reporterRole: user.role,
      source: parsed.data.source,
      summary: sanitizeIssueSummary(parsed.data.summary),
      details: sanitizeIssueDetails(parsed.data.details),
      page: sanitizeIssuePage(parsed.data.page),
      rideId: parsed.data.rideId,
      metadata: sanitizeIssueMetadata(parsed.data.metadata)
    });

    await store.addAuditLog({
      actorId: user.id,
      action: "issue.report.created",
      entityType: "issueReport",
      entityId: report.id,
      metadata: {
        source: report.source,
        rideId: report.rideId
      }
    });

    void (async () => {
      try {
        const github = await createGitHubIssueForReport(report, {
          githubRepo: env.githubRepo,
          githubToken: env.githubToken
        });

        await store.updateIssueReportGitHubSync(report.id, {
          status: "synced",
          githubIssueNumber: github.issueNumber,
          githubIssueUrl: github.issueUrl,
          error: null
        });
      } catch (error) {
        request.log.error({ err: error, issueReportId: report.id }, "Issue report GitHub sync failed");
        await store.updateIssueReportGitHubSync(report.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "GitHub sync failed"
        });
      }
    })();

    return reply.status(201).send({ report });
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

    try {
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
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.post("/rides", { preHandler: requireRole("rider") }, async (request, reply) => {
    const parsed = createRideSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const ride = await rideService.createRide(request.userContext, parsed.data);
      return reply.send(ride);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
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
    const [driver, dues, batches] = await Promise.all([
      store.getDriverAccount(request.userContext.id),
      store.listDriverDues(request.userContext.id),
      store.listDriverDueBatches(request.userContext.id)
    ]);
    const collector = driver?.collectorAdmin ?? null;
    const payoutSettings = collector ? await store.getCollectorPayoutSettings(collector.id) : null;
    const collectibleAccrued = dues.filter((due) => due.status === "pending" && !due.batchId);
    const openBatches = batches.filter((batch) => batch.status === "open");
    const overdueBatches = batches.filter((batch) => batch.status === "overdue");
    const history = batches.filter((batch) => ["paid", "waived", "void"].includes(batch.status));
    const outstandingTotal = Number(
      (
        collectibleAccrued.reduce((total, due) => total + due.amount, 0) +
        openBatches.reduce((total, batch) => total + batch.amount, 0) +
        overdueBatches.reduce((total, batch) => total + batch.amount, 0)
      ).toFixed(2)
    );

    return {
      collectibleAccrued,
      openBatches,
      overdueBatches,
      history,
      payoutSettings,
      collector,
      blocked: overdueBatches.length > 0,
      blockedReason:
        overdueBatches.length > 0
          ? "You have overdue completed-trip dues. Admin must reconcile the batch before dispatch access returns."
          : null,
      overdueCount: overdueBatches.length,
      outstandingTotal
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

  app.post("/driver/location/idle", { preHandler: requireRole("driver") }, async (request, reply) => {
    const parsed = driverIdleLocationSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const driver = await store.recordIdleLocation(request.userContext.id, parsed.data);
      io.emit("driver.availability.changed", driver);
      return reply.send(driver);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
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

  app.get("/admin/dues", { preHandler: requireRole("admin") }, async (request) => {
    const [snapshots, batches, payoutSettings, adminUsers] = await Promise.all([
      store.listDriverDueSnapshots(),
      store.listAllDueBatches(),
      store.getCollectorPayoutSettings(request.userContext.id),
      store.listAdminUsers()
    ]);
    const overdueDrivers = snapshots
      .filter((snapshot) => snapshot.overdueBatchCount > 0)
      .map((snapshot) => ({
        driverId: snapshot.driver.id,
        name: snapshot.driver.name,
        email: snapshot.driver.email,
        phone: snapshot.driver.phone,
        overdueAmount: snapshot.overdueBatchTotal,
        overdueCount: snapshot.overdueBatchCount
      }));
    const openBatches = batches.filter((batch) => batch.status === "open");
    const overdueBatches = batches.filter((batch) => batch.status === "overdue");
    const history = batches.filter((batch) => ["paid", "waived", "void"].includes(batch.status));

    return {
      needsBatching: snapshots,
      openBatches,
      overdueBatches,
      history,
      payoutSettings,
      overdueDrivers,
      adminUsers,
      ownedByDefault: true
    };
  });

  app.post("/admin/dues/generate/:driverId", { preHandler: requireRole("admin") }, async (request, reply) => {
    const driverId = (request.params as { driverId: string }).driverId;
    const batch = await store.createDueBatchForDriver(driverId, request.userContext.id);

    if (!batch) {
      return reply.status(400).send({ message: "No collectible completed-trip dues are ready for batching." });
    }

    await store.addAuditLog({
      actorId: request.userContext.id,
      action: "platformDueBatch.generated",
      entityType: "platformDueBatch",
      entityId: batch.id
    });

    return reply.status(201).send(batch);
  });

  app.post("/admin/dues/reconcile", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminReconcilePlatformDueBatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const batch = await store.reconcileDueBatch({
      ...parsed.data,
      resolvedById: request.userContext.id
    });

    await store.addAuditLog({
      actorId: request.userContext.id,
      action: "platformDueBatch.reconciled",
      entityType: "platformDueBatch",
      entityId: batch.id,
      metadata: parsed.data
    });

    return reply.send(batch);
  });

  app.patch("/admin/dues/batches/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdatePlatformDueBatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const batch = await store.updateDueBatch((request.params as { id: string }).id, {
      ...parsed.data,
      resolvedById: request.userContext.id
    });

    await store.addAuditLog({
      actorId: request.userContext.id,
      action: "platformDueBatch.updated",
      entityType: "platformDueBatch",
      entityId: batch.id,
      metadata: parsed.data
    });

    return reply.send(batch);
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

  app.get("/admin/platform-payout-settings", { preHandler: requireRole("admin") }, async (request) => {
    return store.getCollectorPayoutSettings(request.userContext.id);
  });

  app.put("/admin/platform-payout-settings", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = updatePlatformPayoutSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const settings = await store.updateCollectorPayoutSettings(request.userContext.id, parsed.data);
    return reply.send(settings);
  });

  app.get("/admin/invites", { preHandler: requireRole("admin") }, async (request) => {
    return {
      invites: await store.listAdminInvites(request.userContext.id, resolvePublicBaseUrl(request))
    };
  });


      app.post("/admin/sms/test", { preHandler: requireRole("admin") }, async (request, reply) => {
        const parsed = z
          .object({
            to: z.string().min(8).optional(),
            message: z.string().min(3).max(320).optional(),
            rideId: z.string().min(1).optional(),
            scenario: z
              .enum(["new_job", "accepted", "en_route", "arrived", "in_progress", "completed", "canceled"])
              .optional()
          })
          .safeParse(request.body);

        if (!parsed.success) {
          return sendValidationError(reply, parsed.error.flatten());
        }

        const { to, message, rideId, scenario } = parsed.data;

        if (to && message) {
          await sms.sendRaw(to, message);
          return reply.send({ ok: true, mode: "raw", to });
        }

        if (!rideId || !scenario) {
          return reply.status(400).send({
            message:
              "Provide either { to, message } for a raw test SMS, or { rideId, scenario } for a ride-status simulation."
          });
        }

        const ride = await store.getRideById(rideId);
        if (!ride) {
          return reply.status(404).send({ message: "Ride not found" });
        }

        const riderPhone = to ?? ride.rider.phone ?? null;
        const driverPhone = to ?? ride.driver?.phone ?? null;

        if (scenario === "new_job") {
          if (!driverPhone) {
            return reply.status(400).send({ message: "No driver phone found on this ride. Provide `to` to override." });
          }
          await sms.notifyDriverNewRide(driverPhone, ride);
          return reply.send({ ok: true, mode: "scenario", scenario, to: driverPhone, rideId });
        }

        if (scenario === "accepted") {
          if (!riderPhone) {
            return reply.status(400).send({ message: "No rider phone found on this ride. Provide `to` to override." });
          }
          await sms.notifyRiderDriverAccepted(riderPhone, ride);
          return reply.send({ ok: true, mode: "scenario", scenario, to: riderPhone, rideId });
        }

        if (scenario === "en_route") {
          if (!riderPhone) {
            return reply.status(400).send({ message: "No rider phone found on this ride. Provide `to` to override." });
          }
          await sms.notifyRiderDriverEnRoute(riderPhone, ride);
          return reply.send({ ok: true, mode: "scenario", scenario, to: riderPhone, rideId });
        }

        if (scenario === "arrived") {
          if (!riderPhone) {
            return reply.status(400).send({ message: "No rider phone found on this ride. Provide `to` to override." });
          }
          await sms.notifyRiderDriverArrived(riderPhone, ride);
          return reply.send({ ok: true, mode: "scenario", scenario, to: riderPhone, rideId });
        }

        if (scenario === "in_progress") {
          if (!riderPhone) {
            return reply.status(400).send({ message: "No rider phone found on this ride. Provide `to` to override." });
          }
          await sms.notifyRiderRideStarted(riderPhone, ride);
          return reply.send({ ok: true, mode: "scenario", scenario, to: riderPhone, rideId });
        }

        if (scenario === "completed") {
          if (!riderPhone && !driverPhone) {
            return reply
              .status(400)
              .send({ message: "No rider/driver phone found on this ride. Provide `to` to override." });
          }
          if (riderPhone) {
            await sms.notifyRiderRideComplete(riderPhone, ride);
          }
          if (driverPhone) {
            await sms.notifyDriverRideComplete(driverPhone, ride);
          }
          return reply.send({ ok: true, mode: "scenario", scenario, to: [riderPhone, driverPhone].filter(Boolean), rideId });
        }

        if (!riderPhone && !driverPhone) {
          return reply
            .status(400)
            .send({ message: "No rider/driver phone found on this ride. Provide `to` to override." });
        }
        if (riderPhone) {
          await sms.notifyRiderCanceled(riderPhone, ride);
        }
        if (driverPhone) {
          await sms.notifyDriverCanceled(driverPhone, ride);
        }
        return reply.send({ ok: true, mode: "scenario", scenario, to: [riderPhone, driverPhone].filter(Boolean), rideId });
      });
  app.get("/admin/team", { preHandler: requireRole("admin") }, async (request) => {
    const [admins, invites] = await Promise.all([
      store.listAdminTeamUsers(),
      store.listAdminInvites(null, resolvePublicBaseUrl(request))
    ]);

    return {
      admins,
      invites
    };
  });

  app.post("/admin/invites", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = createAdminInviteSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const invite = await store.createAdminInvite(request.userContext.id, parsed.data, resolvePublicBaseUrl(request));

    await store.addAuditLog({
      actorId: request.userContext.id,
      action: "admin.invite.created",
      entityType: "adminInvite",
      entityId: invite.id,
      metadata: {
        email: invite.email
      }
    });

    return reply.status(201).send(invite);
  });

  app.post("/admin/invites/:id/revoke", { preHandler: requireRole("admin") }, async (request, reply) => {
    try {
      const invite = await store.revokeAdminInvite((request.params as { id: string }).id, request.userContext.id, resolvePublicBaseUrl(request));

      await store.addAuditLog({
        actorId: request.userContext.id,
        action: "admin.invite.revoked",
        entityType: "adminInvite",
        entityId: invite.id
      });

      return reply.send(invite);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
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

    try {
      const driver = await store.updateDriver((request.params as { id: string }).id, {
        approvalStatus: parsed.data.approvalStatus
      });
      io.emit("driver.availability.changed", driver);
      return reply.send(driver);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.patch("/admin/drivers/:id/documents/:documentId", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminReviewDriverDocumentSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const params = request.params as { id: string; documentId: string };
      const document = await store.reviewDriverDocument(params.id, params.documentId, {
        ...parsed.data,
        reviewedById: request.userContext.id
      });

      await store.addAuditLog({
        actorId: request.userContext.id,
        action: "driver.document.reviewed",
        entityType: "driverOnboardingDocument",
        entityId: document.id,
        metadata: parsed.data
      });

      return reply.send(document);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.get("/admin/drivers/:id/documents/:documentId/file", { preHandler: requireRole("admin") }, async (request, reply) => {
    try {
      const params = request.params as { id: string; documentId: string };
      const file = await store.getDriverDocumentFile(params.id, params.documentId);
      reply.header("Content-Disposition", `inline; filename=\"${file.fileName}\"`);
      reply.type(file.mimeType);
      return reply.send(createReadStream(file.absolutePath));
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.get("/admin/drivers", { preHandler: requireRole("admin") }, async () => {
    return store.listDrivers();
  });

  app.patch("/admin/drivers/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminUpdateDriverSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const driver = await store.updateDriver((request.params as { id: string }).id, parsed.data);
      io.emit("driver.availability.changed", driver);
      return reply.send(driver);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.patch("/admin/drivers/:id/collector", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = adminTransferDriverCollectorSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const driver = await store.assignDriverCollector((request.params as { id: string }).id, parsed.data.collectorAdminId);
      return reply.send(driver);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
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

  app.get("/admin/platform-rates/benchmarks", { preHandler: requireRole("admin") }, async () => {
    const rules = await store.listPlatformRateBenchmarks();
    return { rules };
  });

  app.put("/admin/platform-rates/benchmarks", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = updatePlatformRateBenchmarksSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    const rules = await store.upsertPlatformRateBenchmarks(parsed.data.rules);
    return reply.send({ rules });
  });

  app.get("/admin/platform-rates/auto-status", { preHandler: requireRole("admin") }, async () => {
    const benchmarkRules = await store.listPlatformRateBenchmarks();
    const uberSnapshots = benchmarkRules.filter((rule) => rule.provider === "uber").length;
    const lyftSnapshots = benchmarkRules.filter((rule) => rule.provider === "lyft").length;

    return {
      enabled: env.platformRateAutoApplyEnabled,
      runnerMode: autoApplyRunnerMode,
      intervalMinutes: autoApplyIntervalMinutes,
      undercutAmount,
      uberFeedConfigured: uberSnapshots > 0,
      lyftFeedConfigured: lyftSnapshots > 0,
      benchmarkCounts: {
        uber: uberSnapshots,
        lyft: lyftSnapshots
      },
      lastRunAt: autoRateState.lastRunAt,
      lastAppliedRuleCount: autoRateState.lastAppliedRuleCount,
      lastError: autoRateState.lastError
    };
  });

  app.post("/payments/checkout-link", { preHandler: requireRole("driver", "admin") }, async (request, reply) => {
    const schema = z.object({
      amountCents: z.number().int().positive().max(5_000_000),
      description: z.string().min(3).max(120),
      dueId: z.string().optional(),
      rideId: z.string().optional()
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error.flatten());
    }

    try {
      const checkout = await createStripeCheckoutLink({
        amountCents: parsed.data.amountCents,
        description: parsed.data.description,
        metadata: {
          userId: request.userContext.id,
          dueId: parsed.data.dueId ?? "",
          rideId: parsed.data.rideId ?? ""
        }
      });

      await store.addAuditLog({
        actorId: request.userContext.id,
        action: "payment.checkout_link.created",
        entityType: "payment",
        entityId: checkout.sessionId,
        metadata: {
          provider: checkout.provider,
          amountCents: parsed.data.amountCents,
          dueId: parsed.data.dueId,
          rideId: parsed.data.rideId
        }
      });

      return reply.send(checkout);
    } catch (error) {
      return sendKnownOperationalError(reply, error);
    }
  });

  app.post("/admin/platform-rates/auto-apply", { preHandler: requireRole("admin") }, async (_request, reply) => {
    try {
      const result = await applyAutoPlatformRates("manual");
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Auto platform-rate apply failed";
      autoRateState.lastError = message;
      return reply.badRequest(message);
    }
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
