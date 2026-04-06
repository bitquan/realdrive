import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CarFront, LogOut, Route, Shield, UserRound } from "lucide-react";
import type { Role } from "@shared/contracts";
import { AmbientShellMap } from "@/components/layout/ambient-shell-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getMobileNavItems, getShellFrame, getShellSections, isNavItemActive, type ShellAction } from "@/lib/shell";
import { cn, roleLabel, userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const roleIcons: Record<Role, typeof Shield> = {
  admin: Shield,
  driver: Route,
  rider: UserRound
};

function actionClassName(variant: ShellAction["variant"] = "secondary") {
  if (variant === "primary") {
    return "border-ops-primary/45 bg-ops-primary text-white shadow-glow hover:bg-[#6887ff]";
  }

  if (variant === "ghost") {
    return "border-transparent bg-transparent text-ops-muted hover:border-ops-border-soft hover:bg-ops-panel/72 hover:text-ops-text";
  }

  return "border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] text-ops-text hover:border-ops-primary/35 hover:bg-ops-panel";
}

export function AppShell() {
  const { user, token, logout, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const frame = getShellFrame(location.pathname, user);
  const sections = getShellSections(user);
  const CurrentRoleIcon = user ? roleIcons[user.role] : UserRound;
  const mobileHeaderMinimal = frame.mobileHeaderMode === "minimal";
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const isDriverContext = user?.role === "driver" || location.pathname.startsWith("/driver");
  const mobileItems = getMobileNavItems(user, { driverRidePath: "/driver?tab=ride", driverInboxPath: "/driver/inbox" });

  const canCheckNotificationApi = typeof window !== "undefined" && "Notification" in window;
  const permission = canCheckNotificationApi ? Notification.permission : "default";

  const notificationPrefQuery = useQuery({
    queryKey: ["notification-prompt", user?.id],
    queryFn: () => api.getNotificationPreferences(token!),
    enabled: Boolean(user && token)
  });

  useEffect(() => {
    if (!user) {
      setDismissedPrompt(false);
      return;
    }

    const key = `realdrive.notifications.promptDismissed.${user.id}`;
    setDismissedPrompt(window.localStorage.getItem(key) === "1");
  }, [user?.id]);

  useEffect(() => {
    const storageKey = "realdrive.analytics.sessionId";
    let sessionId = window.localStorage.getItem(storageKey);

    if (!sessionId) {
      sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(storageKey, sessionId);
    }

    void api.trackSiteHeartbeat({
      sessionId,
      path: location.pathname,
      referrer: document.referrer || undefined
    }).catch(() => undefined);
  }, [location.pathname]);

  const shouldShowNotificationPrompt = useMemo(() => {
    if (!user || !token || dismissedPrompt) {
      return false;
    }

    if (!canCheckNotificationApi) {
      return false;
    }

    if (notificationPrefQuery.isLoading) {
      return false;
    }

    const pref = notificationPrefQuery.data;
    if (!pref) {
      return permission === "default";
    }

    if (!pref.preferences.pushEnabled) {
      return true;
    }

    if (permission === "default" || permission === "denied") {
      return true;
    }

    return pref.subscriptionCount === 0;
  }, [
    canCheckNotificationApi,
    dismissedPrompt,
    notificationPrefQuery.data,
    notificationPrefQuery.isLoading,
    permission,
    token,
    user
  ]);

  function dismissNotificationPrompt() {
    if (user) {
      const key = `realdrive.notifications.promptDismissed.${user.id}`;
      window.localStorage.setItem(key, "1");
    }
    setDismissedPrompt(true);
  }

  function roleDestination(role: Role) {
    if (role === "admin") {
      return "/admin";
    }

    if (role === "driver") {
      return userHasRole(user, "driver") && user?.approvalStatus !== "approved" ? "/driver/signup" : "/driver";
    }

    return "/rider/rides";
  }

  function goToRole(role: Role) {
    switchRole(role);
    void navigate(roleDestination(role));
  }

  const shellTitle = isDriverContext ? "Driver Dispatch" : "Control Center";
  const shellIntro = isDriverContext ? "Private dispatch" : "RealDrive";
  const notificationPrompt = shouldShowNotificationPrompt ? (
    <div className={cn("rounded-2xl border border-ops-primary/35 bg-ops-panel/70 shadow-soft", isDriverContext ? "p-3" : "p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ops-text">Enable ride notifications</p>
          <p className="mt-1 text-xs text-ops-muted">
            {permission === "denied"
              ? "Notifications are currently blocked in your browser. Open notification settings to re-enable push alerts."
              : "Turn on push alerts so you get new jobs, accepts, arrivals, and ride status updates in real time."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/notifications"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-ops-primary/40 bg-ops-primary/15 px-3 text-xs font-semibold text-ops-text transition hover:bg-ops-primary/25"
          >
            Open notification settings
          </Link>
          <Button variant="ghost" className="h-10 px-3 text-xs" onClick={dismissNotificationPrompt}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ops-bg text-ops-text">
      {frame.mapMode === "ambient" ? <AmbientShellMap /> : null}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1760px]">
        <aside className="hidden min-h-screen w-[292px] shrink-0 border-r border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(9,12,17,0.98),rgba(7,9,13,0.98))] px-5 py-6 lg:flex lg:flex-col">
          <Link
            to="/"
            className="rounded-5xl border border-ops-border bg-[linear-gradient(180deg,rgba(17,21,29,0.98),rgba(11,14,20,0.98))] p-5 shadow-panel transition hover:border-ops-primary/30"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-ops-border-soft bg-ops-panel/88 p-3 text-ops-primary">
                <CarFront className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">{shellIntro}</p>
                <p className="mt-1 text-xl font-bold tracking-[-0.03em] text-ops-text">{shellTitle}</p>
              </div>
            </div>
          </Link>

          <div className="mt-8 flex-1 space-y-7">
            {sections.map((section) => (
              <section key={section.id}>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">{section.label}</p>
                <div className="space-y-1.5">
                  {section.items.map((item) => {
                    const active = isNavItemActive(item, location.pathname, location.search);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.id}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-[1.35rem] border px-3.5 py-3 text-sm font-semibold transition",
                          active
                            ? "border-ops-primary/32 bg-ops-panel text-ops-text shadow-soft"
                            : "border-transparent text-ops-muted hover:border-ops-border-soft hover:bg-ops-panel/72 hover:text-ops-text"
                        )}
                      >
                        <span
                          className={cn(
                            "rounded-xl border p-2",
                            active
                              ? "border-ops-primary/28 bg-ops-primary/18 text-ops-primary"
                              : "border-ops-border-soft bg-ops-panel/82 text-ops-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="space-y-3 border-t border-ops-border-soft/90 pt-4">
            {user ? (
              <div className="rounded-[1.35rem] border border-ops-border-soft bg-ops-panel/52 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-ops-border bg-ops-surface p-2 text-ops-primary">
                    <CurrentRoleIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ops-text">{user.name}</p>
                    <p className="truncate text-sm text-ops-muted">
                      {user.email ?? user.phone ?? roleLabel(user.role)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-ops-border-soft bg-ops-panel/52 p-4 text-sm text-ops-muted">
                Guest mode keeps the live ride flow public while admin and driver tools stay protected.
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(7,9,13,0.96),rgba(6,8,12,0.94))] backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
            <div className="px-3 py-2.5 md:px-6 md:py-4">
              <div className="flex items-center justify-between gap-2 lg:hidden">
                <Link to="/" className="flex min-w-0 items-center gap-2.5">
                  <div className="rounded-2xl border border-ops-border bg-ops-panel/88 p-2 text-ops-primary">
                    <CarFront className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-ops-muted">{shellIntro}</p>
                    <p className="truncate text-sm font-bold tracking-[-0.03em] text-ops-text">{shellTitle}</p>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-2">
                  {user && !isDriverContext ? (
                    <Badge className="border-ops-border-soft bg-ops-panel/92 px-2.5 py-1.5 normal-case tracking-[0.02em] text-ops-text">
                      {roleLabel(user.role)}
                    </Badge>
                  ) : !user ? (
                    <Badge className="border-ops-border-soft bg-ops-panel/92 px-2.5 py-1.5 normal-case tracking-[0.02em] text-ops-text">
                      Guest
                    </Badge>
                  ) : null}

                  {user ? (
                    <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => void logout()} aria-label="Sign out">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {user?.roles.length && user.roles.length > 1 && !isDriverContext ? (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 lg:hidden">
                  {user.roles.map((role) => {
                    const Icon = roleIcons[role];
                    const active = user.role === role;

                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => goToRole(role)}
                        className={cn(
                          "inline-flex h-9 shrink-0 items-center rounded-2xl border px-3 text-xs font-semibold transition",
                          active
                            ? "border-ops-primary/40 bg-ops-primary/16 text-ops-text"
                            : "border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] text-ops-muted hover:border-ops-primary/28 hover:text-ops-text"
                        )}
                      >
                        <Icon className={cn("mr-2 h-3.5 w-3.5", active ? "text-ops-primary" : "text-ops-muted")} />
                        {roleLabel(role)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {!mobileHeaderMinimal ? (
                <div className="mt-2.5 lg:hidden">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-ops-muted">{frame.eyebrow}</p>
                  <h1 className="mt-1 text-lg font-extrabold tracking-[-0.03em] text-ops-text">{frame.title}</h1>
                </div>
              ) : null}

              <div className="hidden flex-col gap-4 lg:flex xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">
                    {frame.eyebrow}
                  </p>
                  <h1 className="mt-1 text-[1.55rem] font-extrabold tracking-[-0.035em] text-ops-text md:text-[2.1rem]">
                    {frame.title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ops-muted md:text-base">{frame.description}</p>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    {user?.roles.length && user.roles.length > 1 ? (
                      <select
                        className="h-11 rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text outline-none transition focus:border-ops-primary/45"
                        value={user.role}
                        onChange={(event) => goToRole(event.target.value as Role)}
                      >
                        {user.roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {user ? (
                      <Badge className="gap-2 border-ops-border-soft bg-ops-panel/92 px-3 py-2 normal-case tracking-[0.04em] text-ops-text">
                        <CurrentRoleIcon className="h-3.5 w-3.5 text-ops-primary" />
                        {user.name} · {roleLabel(user.role)}
                      </Badge>
                    ) : (
                      <Badge className="border-ops-border-soft bg-ops-panel/92 px-3 py-2 normal-case tracking-[0.04em] text-ops-text">
                        Guest mode
                      </Badge>
                    )}

                    {user ? (
                      <Button variant="ghost" className="h-11 px-3.5" onClick={() => void logout()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </Button>
                    ) : null}
                  </div>

                  {frame.actions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {frame.actions.map((action) => {
                        const Icon = action.icon;

                        return (
                          <Link
                            key={`${action.to}-${action.label}`}
                            to={action.to}
                            className={cn(
                              "inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition",
                              actionClassName(action.variant)
                            )}
                          >
                            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                            {action.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main
            className={cn(
              "flex-1 px-4 pb-28 pt-3 md:px-6 md:pb-10 md:pt-5",
              isDriverContext && "pt-2 md:pt-3",
              frame.layout === "immersive" && "px-3 pt-3 md:px-5 md:pt-4"
            )}
          >
            {!isDriverContext ? <div className="mb-4">{notificationPrompt}</div> : null}
            <Outlet />
            {isDriverContext ? <div className="mt-4">{notificationPrompt}</div> : null}
          </main>
        </div>
      </div>

      {mobileItems.length ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(9,12,17,0.98),rgba(7,9,13,0.98))] px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-elevated lg:hidden">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}>
            {mobileItems.map((item) => {
              const active = isNavItemActive(item, location.pathname, location.search);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition",
                    active ? "bg-ops-panel text-ops-text" : "text-ops-muted hover:bg-ops-panel/72 hover:text-ops-text"
                  )}
                >
                  <span
                    className={cn(
                      "rounded-xl border p-2",
                      active
                        ? "border-ops-primary/28 bg-ops-primary/18 text-ops-primary"
                        : "border-ops-border-soft bg-ops-surface/86 text-ops-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.shortLabel ?? item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
