import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LayoutPanelTop, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function TabletAdLoginPage() {
  const navigate = useNavigate();
  const { user, loginDriver } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginDriver,
    onSuccess: () => {
      void navigate("/tablet/ads", { replace: true });
    }
  });

  if (userHasRole(user, "driver") && user?.approvalStatus === "approved") {
    return <Navigate to="/tablet/ads" replace />;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginMutation.isPending || !email || !password) {
      return;
    }

    loginMutation.mutate({ email, password });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.15),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_28%),#04070d] px-4 py-6 text-white md:px-6 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)] md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            <LayoutPanelTop className="h-4 w-4" />
            Driver tablet mode
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] text-white md:text-6xl">Sign in once. Show ads only.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            This login is for the in-car tablet screen. After sign-in, the device stays on the fullscreen ad board instead of the regular driver dashboard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-white">Same driver login</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Use the normal approved driver email and password. No separate ad account is needed.</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-white">Locked display flow</p>
              <p className="mt-2 text-sm leading-6 text-white/65">The tablet opens the ad screen, not rides, dues, settings, or rider account controls.</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-white">Guest ad posting</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Anyone can still open the public advertiser page and submit a campaign.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/advertise">
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Megaphone className="mr-2 h-4 w-4" />
                Post an ad
              </Button>
            </Link>
            <Link to="/driver/login">
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                Open full driver app
              </Button>
            </Link>
          </div>
        </section>

        <Card className="border-white/10 bg-[#090d17] text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
          <CardHeader>
            <CardTitle className="text-2xl">Tablet sign in</CardTitle>
            <CardDescription className="text-white/60">Approved drivers sign in here to launch the fullscreen ad board.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="tabletDriverEmail">Email</Label>
                <Input
                  id="tabletDriverEmail"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="driver@example.com"
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tabletDriverPassword">Password</Label>
                <Input
                  id="tabletDriverPassword"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>
              {loginMutation.error ? <p className="text-sm text-rose-300">{loginMutation.error.message}</p> : null}
              <Button className="w-full" type="submit" disabled={loginMutation.isPending || !email || !password}>
                Launch tablet ad screen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TabletAdLoginPage;
