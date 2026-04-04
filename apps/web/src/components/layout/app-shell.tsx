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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(184,97,59,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(107,124,85,0.15),transparent_30%)]">
      <header className="sticky top-0 z-20 border-b border-brand-ink/8 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-ink p-3 text-white">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-ink/45">RealDrive</p>
              <p className="text-lg font-bold">Community-powered rides</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/" className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5">
              Book a ride
            </NavLink>
            <NavLink to="/driver/signup" className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5">
              Drive with us
            </NavLink>
            {user ? (
              <NavLink to="/community" className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5">
                Community
              </NavLink>
            ) : null}
            {userHasRole(user, "rider") ? (
              <NavLink to="/rider/rides" className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5">
                My Rides
              </NavLink>
            ) : null}
            {userHasRole(user, "driver") ? (
              <NavLink to="/driver" className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5">
                Driver App
              </NavLink>
            ) : null}
            {userHasRole(user, "admin") ? (
              <NavLink to="/admin" className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5">
                Admin
              </NavLink>
            ) : null}
            {userHasRole(user, "admin") ? (
              <NavLink to="/admin/dues" className="rounded-full px-4 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-ink/5">
                Dues
              </NavLink>
            ) : null}
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <>
                {user.roles.length > 1 ? (
                  <select
                    className="h-10 rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm"
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
                <Button variant="outline" onClick={() => void logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <Badge className="gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Guest mode
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
