import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Bug, Lightbulb, Loader2, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { registerPushSubscription, removePushSubscription } from "@/lib/push";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/providers/auth-provider";

const PREF_QUERY_KEY = ["notification-preferences"] as const;
const LOGS_QUERY_KEY = ["notification-delivery-logs"] as const;

export function NotificationPreferencesPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; label: string; at: string }>>([]);

  const prefQuery = useQuery({
    queryKey: PREF_QUERY_KEY,
    queryFn: () => api.getNotificationPreferences(token!),
    enabled: Boolean(token)
  });

  const logsQuery = useQuery({
    queryKey: LOGS_QUERY_KEY,
    queryFn: () => api.listNotificationDeliveryLogs(token!, 25),
    enabled: Boolean(token),
    refetchInterval: 20_000
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

  useEffect(() => {
    if (!token) {
      setSocketState("disconnected");
      setLiveEvents([]);
      return;
    }

    const socket = getSocket(token);
    setSocketState(socket.connected ? "connected" : "connecting");

    const onConnect = () => setSocketState("connected");
    const onDisconnect = () => setSocketState("disconnected");
    const onRideStatus = () => {
      const event = { id: `${Date.now()}-status`, label: "Ride status event received", at: new Date().toISOString() };
      setLiveEvents((current) => [event, ...current].slice(0, 6));
      void queryClient.invalidateQueries({ queryKey: LOGS_QUERY_KEY });
    };
    const onRideLocation = () => {
      const event = { id: `${Date.now()}-location`, label: "Ride location event received", at: new Date().toISOString() };
      setLiveEvents((current) => [event, ...current].slice(0, 6));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("ride.status.changed", onRideStatus);
    socket.on("ride.location.updated", onRideLocation);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("ride.status.changed", onRideStatus);
      socket.off("ride.location.updated", onRideLocation);
    };
  }, [queryClient, token]);

  const loading = prefQuery.isLoading || logsQuery.isLoading;
  const pushBusy = enablePushMutation.isPending || disablePushMutation.isPending || testPushMutation.isPending;

  const deliverySummary = useMemo(() => {
    return logs.reduce(
      (summary, log) => {
        if (log.status === "sent") {
          summary.sent += 1;
        } else if (log.status === "failed") {
          summary.failed += 1;
        } else {
          summary.skipped += 1;
        }

        return summary;
      },
      { sent: 0, failed: 0, skipped: 0 }
    );
  }, [logs]);

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
      <div className="space-y-6">
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

              <div className="rounded-2xl border border-ops-border-soft bg-ops-panel/35 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ops-text">Realtime continuity</p>
                  <Badge className={socketState === "connected" ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200" : ""}>
                    <Radio className="mr-1 h-3 w-3" />
                    {socketState}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ops-muted">
                  Connection state and recent socket events are shown here so rider/driver status continuity stays visible outside trip pages.
                </p>
                <ul className="mt-3 space-y-2 text-xs text-ops-muted">
                  {liveEvents.length ? (
                    liveEvents.map((event) => (
                      <li key={event.id} className="rounded-xl border border-ops-border-soft bg-ops-surface/60 px-3 py-2">
                        <p className="font-medium text-ops-text">{event.label}</p>
                        <p>{new Date(event.at).toLocaleTimeString()}</p>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-xl border border-ops-border-soft bg-ops-surface/60 px-3 py-2">
                      Waiting for live ride events.
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}

          {feedback ? <p className="text-sm text-ops-muted">{feedback}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue intake workflows</CardTitle>
          <CardDescription>Keep product and defect feedback in the same live intake routes tied to role and context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            to={`/request-feature?source=${sourceFromRole(user?.role)}&contextPath=${encodeURIComponent("/notifications")}`}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-3 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            Request feature
          </Link>
          <Link
            to={`/report-bug?source=${sourceFromRole(user?.role)}&contextPath=${encodeURIComponent("/notifications")}`}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-3 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
          >
            <Bug className="mr-2 h-4 w-4" />
            Report bug
          </Link>
        </CardContent>
      </Card>
      </div>

      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Delivery log</CardTitle>
          <CardDescription>Last 25 notification attempts for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid gap-2 text-xs text-ops-muted sm:grid-cols-3">
            <p className="rounded-xl border border-ops-border-soft bg-ops-panel/30 px-3 py-2">Sent: <span className="font-semibold text-ops-text">{deliverySummary.sent}</span></p>
            <p className="rounded-xl border border-ops-border-soft bg-ops-panel/30 px-3 py-2">Failed: <span className="font-semibold text-ops-text">{deliverySummary.failed}</span></p>
            <p className="rounded-xl border border-ops-border-soft bg-ops-panel/30 px-3 py-2">Skipped: <span className="font-semibold text-ops-text">{deliverySummary.skipped}</span></p>
          </div>
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
    </div>
  );
}

function sourceFromRole(role: "rider" | "driver" | "admin" | undefined) {
  if (role === "admin") {
    return "admin_dashboard";
  }

  if (role === "driver") {
    return "driver_app";
  }

  return "rider_app";
}
