import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export interface CreateCheckoutLinkInput {
  amountCents: number;
  description: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutLinkResult {
  provider: "stripe";
  sessionId: string;
  checkoutUrl: string;
}

function assertStripeConfigured() {
  if (!env.stripeSecretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in API environment variables.");
  }

  if (!env.stripeSuccessUrl || !env.stripeCancelUrl) {
    throw new Error("Stripe URLs are missing. Set STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL.");
  }
}

export async function createStripeCheckoutLink(input: CreateCheckoutLinkInput): Promise<CheckoutLinkResult> {
  assertStripeConfigured();

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", input.successUrl ?? env.stripeSuccessUrl);
  body.set("cancel_url", input.cancelUrl ?? env.stripeCancelUrl);
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  body.set("line_items[0][price_data][product_data][name]", input.description);
  body.set("line_items[0][quantity]", "1");

  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    body.set(`metadata[${key}]`, value);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: string;
        url?: string;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Unable to create Stripe checkout session");
  }

  if (!payload?.id || !payload?.url) {
    throw new Error("Stripe checkout response did not include a session URL");
  }

  return {
    provider: "stripe",
    sessionId: payload.id,
    checkoutUrl: payload.url
  };
}

/**
 * Verify a Stripe webhook signature and return the parsed event payload.
 * Returns null if STRIPE_WEBHOOK_SECRET is not configured (manual fallback mode).
 * Throws if the signature is invalid.
 */
export function verifyStripeWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string
): { type: string; data: { object: Record<string, unknown> } } | null {
  if (!env.stripeWebhookSecret) {
    return null; // Webhook verification disabled — Stripe not in active use yet
  }

  // Stripe-Signature: t=timestamp,v1=sig,...
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, ...rest] = part.split("=");
      return [k, rest.join("=")];
    })
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) {
    throw new Error("Invalid Stripe-Signature header");
  }

  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const signedPayload = `${timestamp}.${body}`;

  const computedSig = createHmac("sha256", env.stripeWebhookSecret)
    .update(signedPayload)
    .digest("hex");

  const a = Buffer.from(computedSig, "hex");
  const b = Buffer.from(signature, "hex");
  const isValid = a.length === b.length && timingSafeEqual(a, b);

  if (!isValid) {
    throw new Error("Stripe webhook signature verification failed");
  }

  return JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
}

/**
 * Hash an API key for secure storage. Returns the SHA-256 hex digest.
 */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Generate a new API key. Returns { plaintext, prefix, hash }.
 */
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const plaintext = `rd_${raw}`;
  const prefix = plaintext.slice(0, 10); // "rd_" + 7 chars
  const hash = hashApiKey(plaintext);
  return { plaintext, prefix, hash };
}
