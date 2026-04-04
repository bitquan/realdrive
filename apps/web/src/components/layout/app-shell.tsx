import { Link, NavLink, Outlet } from "react-router-dom";
import { CarFront, LogOut, MessageSquare, Route, Shield, UserRound } from "lucide-react";
import type { Role } from "@shared/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { roleLabel, userHasRole } from "@/lib/utils";

const roleIcons: Record<Role, typeof Shield> = {
  admin: Shield,
  driver: Route,
  rider: UserRound
};

export function AppShell() {
  const { user, logout, switchRole } = useAuth();
  const CurrentRoleIcon = user ? roleIcons[user.role] : UserRound;

  const navClassName = ({ isActive }: { isActive: boolean }) =>
    [
      "flex shrink-0 items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition md:px-3 md:py-2 md:text-[13px]",
      isActive
        ? "border-ops-primary/45 bg-ops-primary/12 text-ops-text"
        : "border-transparent text-ops-muted hover:border-ops-border-soft hover:bg-ops-panel/65 hover:text-ops-text"
    ].join(" ");

  return (
    <div className="min-h-screen bg-ops-bg text-ops-text">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col md:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-ops-border-soft bg-[#0b111d]/92 p-4 md:block">
          <Link to="/" className="flex items-center gap-3 rounded-xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/90 to-[#111a2a] p-3 shadow-panel">
            <div className="rounded-xl bg-ops-primary/18 p-2.5 text-ops-primary">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ops-muted">RealDrive</p>
              <p className="text-sm font-semibold text-ops-text">Control Center</p>
            </div>
          </Link>

          <nav className="mt-6 space-y-1">
            <NavLink to="/" className={navClassName}>
              Book a ride
            </NavLink>
            <NavLink to="/driver/signup" className={navClassName}>
              Drive with us
            </NavLink>
            {user ? (
              <NavLink to="/community" className={navClassName}>
                Community
              </NavLink>
            ) : null}
            {userHasRole(user, "rider") ? (
              <NavLink to="/rider/rides" className={navClassName}>
                My rides
              </NavLink>
            ) : null}
            {userHasRole(user, "driver") ? (
              <NavLink to="/driver" className={navClassName}>
                Driver app
              </NavLink>
            ) : null}
            {userHasRole(user, "admin") ? (
              <NavLink to="/admin" className={navClassName}>
                Admin
              </NavLink>
            ) : null}
            {userHasRole(user, "admin") ? (
              <NavLink to="/admin/dues" className={navClassName}>
                Dues
              </NavLink>
            ) : null}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-ops-border-soft bg-ops-bg/94 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
            <div className="px-3 py-1.5 md:px-6 md:py-2.5">
              <div className="flex items-center justify-between gap-2">
                <Link to="/" className="flex items-center gap-2.5 md:hidden">
                  <div className="rounded-lg bg-ops-primary/20 p-1.5 text-ops-primary">
                    <CarFront className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">RealDrive Ops</p>
                </Link>

                <div className="ml-auto flex items-center gap-2">
                {user ? (
                  <>
                    {user.roles.length > 1 ? (
                      <select
                        className="h-8 rounded-lg border border-ops-border bg-ops-panel px-2 text-[11px] text-ops-muted md:h-10 md:rounded-xl md:px-3 md:text-sm md:text-ops-text"
                        value={user.role}
                        onChange={(event) => switchRole(event.target.value as Role)}
                      >
                        {user.roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <Badge className="hidden gap-2 md:inline-flex">
                      <CurrentRoleIcon className="h-3.5 w-3.5" />
                      {user.name} · {roleLabel(user.role)}
                    </Badge>
                    <Button variant="ghost" className="h-8 px-2.5 text-[11px] text-ops-muted md:h-10 md:px-4 md:text-sm" onClick={() => void logout()}>
                      <LogOut className="h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4" />
                      <span className="hidden md:inline">Sign out</span>
                    </Button>
                  </>
                ) : (
                  <Badge className="gap-2 text-[10px] md:text-[11px]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Guest mode
                  </Badge>
                )}
                </div>
              </div>

              <nav className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-0.5 md:mt-2">
                <NavLink to="/" className={navClassName}>
                  Ride
                </NavLink>
                <NavLink to="/driver/signup" className={navClassName}>
                  Driver
                </NavLink>
                {user ? (
                  <NavLink to="/community" className={navClassName}>
                    Community
                  </NavLink>
                ) : null}
              </nav>
            </div>
          </header>

          <main className="flex-1 px-4 pb-4 pt-2.5 md:px-6 md:pb-5 md:pt-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
