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
