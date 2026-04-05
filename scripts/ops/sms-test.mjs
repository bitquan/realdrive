#!/usr/bin/env node

/**
 * One-command SMS smoke test.
 *
 * Env vars:
 * - SMS_TEST_API_BASE_URL (default: http://localhost:4000)
 * - SMS_TEST_ADMIN_EMAIL (required)
 * - SMS_TEST_ADMIN_PASSWORD (required)
 * - SMS_TEST_TO (required for raw mode)
 * - SMS_TEST_MESSAGE (optional, default text)
 *
 * Optional scenario mode (instead of raw message):
 * - SMS_TEST_RIDE_ID
 * - SMS_TEST_SCENARIO: new_job | accepted | en_route | arrived | completed | canceled
 */

const apiBaseUrl = process.env.SMS_TEST_API_BASE_URL ?? "http://localhost:4000";
const adminEmail = process.env.SMS_TEST_ADMIN_EMAIL;
const adminPassword = process.env.SMS_TEST_ADMIN_PASSWORD;
const tokenFromEnv = process.env.SMS_TEST_TOKEN ?? process.env.TOKEN;
const to = process.env.SMS_TEST_TO ?? "+18777804236";
const message = process.env.SMS_TEST_MESSAGE ?? "RealDrive SMS smoke test";
const rideId = process.env.SMS_TEST_RIDE_ID;
const scenario = process.env.SMS_TEST_SCENARIO;

function fail(message, detail) {
  console.error(`❌ ${message}`);
  if (detail) {
    console.error(typeof detail === "string" ? detail : JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

const scenarioMode = Boolean(rideId || scenario);

if (scenarioMode && (!rideId || !scenario)) {
  fail("Scenario mode requires both SMS_TEST_RIDE_ID and SMS_TEST_SCENARIO");
}

const headers = {
  "Content-Type": "application/json"
};

async function loginAdmin() {
  const response = await fetch(`${apiBaseUrl}/admin/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.token) {
    fail("Admin login failed", payload ?? { status: response.status });
  }

  return payload.token;
}

async function sendSms(token) {
  const body = scenarioMode
    ? {
        rideId,
        scenario,
        ...(to ? { to } : {})
      }
    : {
        to,
        message
      };

  const response = await fetch(`${apiBaseUrl}/admin/sms/test`, {
    method: "POST",
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    fail("SMS test request failed", payload ?? { status: response.status });
  }

  console.log("✅ SMS test request accepted");
  console.log(JSON.stringify(payload, null, 2));

  if (!scenarioMode) {
    console.log("ℹ️ Check Twilio Logs/Virtual Phone for final delivery status.");
  }
}

(async () => {
  const token = tokenFromEnv ?? (await loginAdmin());

  if (!token) {
    fail("Missing authentication", {
      required: [
        "Either SMS_TEST_TOKEN (or TOKEN), OR both SMS_TEST_ADMIN_EMAIL and SMS_TEST_ADMIN_PASSWORD"
      ]
    });
  }

  if (!tokenFromEnv && (!adminEmail || !adminPassword)) {
    fail("Missing admin credentials", {
      required: [
        "Either SMS_TEST_TOKEN (or TOKEN), OR both SMS_TEST_ADMIN_EMAIL and SMS_TEST_ADMIN_PASSWORD"
      ]
    });
  }

  await sendSms(token);
})();
