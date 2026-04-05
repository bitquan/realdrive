import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { registerPushSubscription, removePushSubscription } from "@/lib/push";
import { useAuth } from "@/providers/auth-provider";

const PREF_QUERY_KEY = ["notification-preferences"] as const;
const LOGS_QUERY_KEY = ["notification-delivery-logs"] as const;

export function NotificationPreferencesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const prefQuery = useQuery({
    queryKey: PREF_QUERY_KEY,
    queryFn: () => api.getNotificationPreferences(token!),
    enabled: Boolean(token)
  });

  const logsQuery = useQuery({
    queryKey: LOGS_QUERY_KEY,
    queryFn: () => api.listNotificationDeliveryLogs(token!, 25),
    enabled: Boolean(token)
  });

  const updatePrefMutation = useMutation({
    mutationFn: (input: { pushEnabled?: boolean; smsCriticalOnly?: boolean }) => api.updateNotificationPreferences(input, token!),
    onSuccess: () => {
      setFeedback("Preferences updated.");
      void queryClient.invalidateQueries({ queryKey: PREF_QUERY_KEY });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to update preferences.");
    }
  });

  const enablePushMutation = useMutation({
    mutationFn: async () => {
      const config = await api.publicPushConfig();
      if (!config.enabled || !config.vapidPublicKey) {
        throw new Error("Push notifications are not configured on the server yet.");
      }

      const subscription = await registerPushSubscription(config.vapidPublicKey);
      await api.upsertPushSubscription(subscription, token!);
      await api.updateNotificationPreferences({ pushEnabled: true }, token!);
    },
    onSuccess: () => {
      setFeedback("Push notifications enabled for this browser.");
      void queryClient.invalidateQueries({ queryKey: PREF_QUERY_KEY });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to enable push notifications.");
    }
  });

  const disablePushMutation = useMutation({
    mutationFn: async () => {
      const endpoint = await removePushSubscription();
      if (endpoint) {
        await api.unsubscribePushSubscription(endpoint, token!);
      }
      await api.updateNotificationPreferences({ pushEnabled: false }, token!);
    },
    onSuccess: () => {
      setFeedback("Push notifications disabled for this browser.");
      void queryClient.invalidateQueries({ queryKey: PREF_QUERY_KEY });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to disable push notifications.");
    }
  });

  const testPushMutation = useMutation({
    mutationFn: async () => api.sendTestPushNotification(token!),
    onSuccess: (result) => {
      if (result.push.sentCount > 0) {
        setFeedback("Test push sent. If app is closed, check your device notifications. If app is open, check notification center and OS alerts.");
      } else if (!result.push.pushEnabled) {
        setFeedback("Push is disabled in your preferences. Enable push first.");
      } else {
        setFeedback("Push test ran but no active subscription was found for this browser. Tap Enable push on this browser first.");
      }

      void queryClient.invalidateQueries({ queryKey: PREF_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LOGS_QUERY_KEY });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to send test push notification.");
    }
  });

  const preferences = prefQuery.data?.preferences;
  const logs = logsQuery.data?.logs ?? [];

  const loading = prefQuery.isLoading || logsQuery.isLoading;
  const pushBusy = enablePushMutation.isPending || disablePushMutation.isPending || testPushMutation.isPending;

  const pushStatus = useMemo(() => {
    if (!prefQuery.data) {
      return "Checking...";
    }

    if (!preferences?.pushEnabled) {
      return "Push disabled";
    }

    if (prefQuery.data.subscriptionCount > 0) {
      return `Push enabled on ${prefQuery.data.subscriptionCount} device${prefQuery.data.subscriptionCount > 1 ? "s" : ""}`;
    }

    return "Push enabled, but no active browser subscription";
  }, [prefQuery.data, preferences?.pushEnabled]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.58fr_0.42fr]">
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>
            Control push notifications and SMS critical alerts. SMS is only used as fallback when push fails or is unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <p className="text-sm text-ops-muted">Loading preferences...</p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-ops-muted">Push status: {pushStatus}</p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={pushBusy} onClick={() => enablePushMutation.mutate()}>
                    {enablePushMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                    Enable push on this browser
                  </Button>
                  <Button variant="outline" disabled={pushBusy} onClick={() => testPushMutation.mutate()}>
                    {testPushMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                    Send test push
                  </Button>
                  <Button variant="ghost" disabled={pushBusy} onClick={() => disablePushMutation.mutate()}>
                    {disablePushMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
                    Disable push on this browser
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-ops-border-soft bg-ops-panel/35 p-4">
                <label className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-ops-text">Push notifications</Label>
                    <p className="text-xs text-ops-muted">Receive in-browser ride updates when available.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.pushEnabled)}
                    onChange={(event) => updatePrefMutation.mutate({ pushEnabled: event.target.checked })}
                    className="h-4 w-4 accent-ops-primary"
                    disabled={updatePrefMutation.isPending}
                  />
                </label>

                <label className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-ops-text">SMS critical fallback</Label>
                    <p className="text-xs text-ops-muted">Send SMS for critical ride events only when push fails or is unavailable.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.smsCriticalOnly)}
                    onChange={(event) => updatePrefMutation.mutate({ smsCriticalOnly: event.target.checked })}
                    className="h-4 w-4 accent-ops-primary"
                    disabled={updatePrefMutation.isPending}
                  />
                </label>
              </div>
            </>
          )}

          {feedback ? <p className="text-sm text-ops-muted">{feedback}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery log</CardTitle>
          <CardDescription>Last 25 notification attempts for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-ops-muted">No notification events yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="rounded-xl border border-ops-border-soft bg-ops-panel/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ops-text">
                      {log.channel.toUpperCase()} · {log.eventKey}
                    </p>
                    <span className="text-xs uppercase tracking-wide text-ops-muted">{log.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-ops-muted">
                    {new Date(log.createdAt).toLocaleString()} {log.rideId ? `· ride ${log.rideId}` : ""}
                  </p>
                  {log.errorCode || log.errorText ? (
                    <p className="mt-1 text-xs text-amber-300">{log.errorCode ?? ""} {log.errorText ?? ""}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
