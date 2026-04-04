import "dotenv/config";

function asNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  githubRepo: process.env.GITHUB_REPO ?? "",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  driverDocumentUploadDir: process.env.DRIVER_DOCUMENT_UPLOAD_DIR ?? "uploads/driver-documents"
};
