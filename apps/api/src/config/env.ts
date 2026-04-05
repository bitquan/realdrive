import "dotenv/config";

function asNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const env = {
  port: asNumber(process.env.PORT, 4000),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "realdrive-dev-secret",
  databaseUrl: process.env.DATABASE_URL ?? "",
  launchMode: process.env.LAUNCH_MODE ?? "marketplace",
  ownerDriverUserId: process.env.OWNER_DRIVER_USER_ID ?? "",
  ownerDriverPhone: process.env.OWNER_DRIVER_PHONE ?? "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",
  mapboxToken: process.env.MAPBOX_TOKEN ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  webPushVapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? "",
  webPushVapidPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "",
  webPushVapidSubject: process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:support@realdrive.app",
  githubRepo: process.env.GITHUB_REPO ?? "",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  platformRateAutoApplyEnabled: asBoolean(process.env.PLATFORM_RATE_AUTO_APPLY_ENABLED, false),
  platformRateAutoApplyMinutes: asNumber(process.env.PLATFORM_RATE_AUTO_APPLY_MINUTES, 60),
  platformRateUndercutAmount: asNumber(process.env.PLATFORM_RATE_UNDERCUT_AMOUNT, 0.05),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  driverDocumentUploadDir: process.env.DRIVER_DOCUMENT_UPLOAD_DIR ?? "uploads/driver-documents"
};
