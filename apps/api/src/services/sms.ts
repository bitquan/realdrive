import twilio from "twilio";
import { env } from "../config/env.js";
import type { Ride } from "@shared/contracts";

/**
 * SMS notification service — sends status updates to drivers and riders.
 * Uses the existing Twilio account SID / auth token for messaging.
 * Requires TWILIO_FROM_NUMBER (a Twilio messaging-capable number or Messaging Service).
 * Falls back to no-op with a console.info when not configured.
 */
export interface SmsService {
  sendRaw(to: string, body: string): Promise<void>;
  notifyDriverNewRide(driverPhone: string, ride: Ride): Promise<void>;
  notifyRiderDriverAccepted(riderPhone: string, ride: Ride): Promise<void>;
  notifyRiderDriverEnRoute(riderPhone: string, ride: Ride): Promise<void>;
  notifyRiderDriverArrived(riderPhone: string, ride: Ride): Promise<void>;
  notifyRiderRideStarted(riderPhone: string, ride: Ride): Promise<void>;
  notifyRiderRideComplete(riderPhone: string, ride: Ride): Promise<void>;
  notifyDriverRideComplete(driverPhone: string, ride: Ride): Promise<void>;
  notifyRiderCanceled(riderPhone: string, ride: Ride): Promise<void>;
  notifyDriverCanceled(driverPhone: string, ride: Ride): Promise<void>;
}

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : "";
}

function shortAddress(address: string) {
  // Return just the first component (street number + name) to keep SMS concise
  return address.split(",")[0].trim();
}

export function createSmsService(): SmsService {
  const isConfigured =
    Boolean(env.twilioAccountSid) &&
    Boolean(env.twilioAuthToken) &&
    Boolean(env.twilioFromNumber);

  const client = isConfigured
    ? twilio(env.twilioAccountSid, env.twilioAuthToken)
    : null;

  async function send(to: string, body: string, options?: { strict?: boolean }): Promise<void> {
    if (!client) {
      console.info(`[SMS no-op] to=${to} | ${body}`);
      return;
    }

    try {
      await client.messages.create({
        from: env.twilioFromNumber,
        to,
        body,
      });
    } catch (err) {
      if (options?.strict) {
        throw err;
      }

      // Never let SMS failure break the ride flow
      console.error(`[SMS error] to=${to}:`, err);
    }
  }

  return {
    async sendRaw(to, body) {
      await send(to, body, { strict: true });
    },

    /** Driver: you have a new ride offer */
    async notifyDriverNewRide(driverPhone, ride) {
      const fare = fmt(ride.pricing.estimatedCustomerTotal);
      const pickup = shortAddress(ride.pickup.address);
      const method = ride.payment.method.toUpperCase();
      await send(
        driverPhone,
        `🚗 New ride near ${pickup} — ${fare} · ${method}. Open the app to accept before it expires.`,
      );
    },

    /** Rider: driver accepted, sharing name + vehicle */
    async notifyRiderDriverAccepted(riderPhone, ride) {
      const driverName = ride.driver?.name ?? "Your driver";
      const vehicle = ride.driver?.vehicle;
      const vehicleStr = vehicle
        ? `${vehicle.color ? vehicle.color + " " : ""}${vehicle.makeModel} (${vehicle.plate})`
        : "their vehicle";
      await send(
        riderPhone,
        `✅ ${driverName} accepted your ride and is heading to you in ${vehicleStr}.`,
      );
    },

    /** Rider: driver is en route */
    async notifyRiderDriverEnRoute(riderPhone, ride) {
      const driverName = ride.driver?.name ?? "Your driver";
      const pickup = shortAddress(ride.pickup.address);
      await send(
        riderPhone,
        `🗺️ ${driverName} is on the way to ${pickup}.`,
      );
    },

    /** Rider: driver has arrived */
    async notifyRiderDriverArrived(riderPhone, ride) {
      const driverName = ride.driver?.name ?? "Your driver";
      const pickup = shortAddress(ride.pickup.address);
      await send(
        riderPhone,
        `📍 ${driverName} has arrived at ${pickup}. Please come out!`,
      );
    },

    /** Rider: ride has started */
    async notifyRiderRideStarted(riderPhone, ride) {
      const driverName = ride.driver?.name ?? "Your driver";
      const dropoff = shortAddress(ride.dropoff.address);
      await send(
        riderPhone,
        `🛣️ Your trip with ${driverName} is now in progress to ${dropoff}.`,
      );
    },

    /** Rider: ride complete with fare */
    async notifyRiderRideComplete(riderPhone, ride) {
      const total = fmt(ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal);
      const method = ride.payment.method.toUpperCase();
      await send(
        riderPhone,
        `🏁 Ride complete! Total: ${total} via ${method}. Thanks for riding with RealDrive.`,
      );
    },

    /** Driver: ride complete with net earnings */
    async notifyDriverRideComplete(driverPhone, ride) {
      const net = fmt(ride.pricing.finalDriverNet ?? ride.pricing.estimatedDriverNet);
      const method = ride.payment.method.toUpperCase();
      await send(
        driverPhone,
        `🏁 Ride complete! Your net: ${net} via ${method}. Platform due will be logged shortly.`,
      );
    },

    /** Rider: ride was canceled */
    async notifyRiderCanceled(riderPhone, ride) {
      const pickup = shortAddress(ride.pickup.address);
      await send(
        riderPhone,
        `❌ Your ride from ${pickup} has been canceled. You can book a new ride anytime.`,
      );
    },

    /** Driver: ride was canceled */
    async notifyDriverCanceled(driverPhone, ride) {
      const pickup = shortAddress(ride.pickup.address);
      await send(
        driverPhone,
        `❌ Ride from ${pickup} has been canceled.`,
      );
    },
  };
}
