import type { Server as SocketIOServer } from "socket.io";
import type { SessionUser } from "@shared/contracts";
import type { createRideService } from "../services/ride-service.js";
import type { MapsService, OtpService, Store } from "../services/types.js";

export interface Services {
  store: Store;
  otp: OtpService;
  maps: MapsService;
  rideService: ReturnType<typeof createRideService>;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    services: Services;
    io: SocketIOServer;
  }

  interface FastifyRequest {
    userContext: SessionUser;
  }
}
