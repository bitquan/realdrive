import twilio from "twilio";
import { env } from "../config/env.js";
import type { OtpService } from "./types.js";

interface StoredCode {
  code: string;
  expiresAt: number;
}

const memoryCodes = new Map<string, StoredCode>();

export function createOtpService(): OtpService {
  const hasTwilio =
    Boolean(env.twilioAccountSid) &&
    Boolean(env.twilioAuthToken) &&
    Boolean(env.twilioVerifyServiceSid);

  const client = hasTwilio
    ? twilio(env.twilioAccountSid, env.twilioAuthToken)
    : null;

  return {
    async requestCode(phone) {
      if (client) {
        await client.verify.v2
          .services(env.twilioVerifyServiceSid)
          .verifications.create({ to: phone, channel: "sms" });
        return { ok: true };
      }

      const code = `${Math.floor(100000 + Math.random() * 900000)}`;
      memoryCodes.set(phone, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000
      });
      return { ok: true, devCode: code };
    },

    async verifyCode(phone, code) {
      if (client) {
        const result = await client.verify.v2
          .services(env.twilioVerifyServiceSid)
          .verificationChecks.create({ to: phone, code });
        return result.status === "approved";
      }

      const stored = memoryCodes.get(phone);
      if (!stored || stored.expiresAt < Date.now()) {
        memoryCodes.delete(phone);
        return false;
      }

      const matches = stored.code === code;
      if (matches) {
        memoryCodes.delete(phone);
      }
      return matches;
    }
  };
}
