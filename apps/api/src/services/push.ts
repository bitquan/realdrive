import webpush from "web-push";
import { env } from "../config/env.js";

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSendResult {
  sentCount: number;
  failed: Array<{
    endpoint: string;
    code: string | null;
    message: string | null;
    removeSubscription: boolean;
  }>;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : null;
}

export function createPushService() {
  const enabled =
    Boolean(env.webPushVapidPublicKey) &&
    Boolean(env.webPushVapidPrivateKey) &&
    Boolean(env.webPushVapidSubject);

  if (enabled) {
    webpush.setVapidDetails(env.webPushVapidSubject, env.webPushVapidPublicKey, env.webPushVapidPrivateKey);
  }

  return {
    isEnabled() {
      return enabled;
    },

    publicVapidKey() {
      return env.webPushVapidPublicKey;
    },

    async sendToSubscriptions(
      subscriptions: PushSubscriptionRecord[],
      payload: PushNotificationPayload
    ): Promise<PushSendResult> {
      if (!enabled || subscriptions.length === 0) {
        return {
          sentCount: 0,
          failed: []
        };
      }

      let sentCount = 0;
      const failed: PushSendResult["failed"] = [];

      const body = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        icon: payload.icon,
        tag: payload.tag,
        metadata: payload.metadata ?? null
      });

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(subscription, body, {
            TTL: 60,
            urgency: "normal"
          });
          sentCount += 1;
        } catch (error) {
          const statusCode =
            typeof error === "object" && error && "statusCode" in error
              ? String((error as { statusCode?: number }).statusCode ?? "")
              : null;
          const removeSubscription = statusCode === "404" || statusCode === "410";

          failed.push({
            endpoint: subscription.endpoint,
            code: statusCode,
            message: stringifyError(error),
            removeSubscription
          });
        }
      }

      return {
        sentCount,
        failed
      };
    }
  };
}
