import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function DriverLoginPage() {
  const navigate = useNavigate();
  const { user, loginDriver } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginDriver,
    onSuccess: () => {
      void navigate("/driver");
    }
  });

  if (userHasRole(user, "driver")) {
    return <Navigate to="/driver" replace />;
  }

  return (
    <div className="grid gap-5 md:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] border border-brand-ink/10 bg-white/90 p-5 shadow-soft md:p-8">
        <PageHero
          title="Driver sign in"
          description="Approved drivers use email and password to access live offers, active rides, dues status, and dispatch settings."
          className="border-0 bg-transparent p-0 shadow-none"
        />

        <div className="mt-4 rounded-4xl border border-brand-ink/10 bg-brand-sand/40 p-5 text-sm text-brand-ink/65">
          <p className="font-semibold text-brand-ink">No account yet?</p>
          <p className="mt-2">
            New driver accounts begin in pending status and unlock after admin approval.
          </p>
          <Link to="/driver/signup" className="mt-3 inline-flex font-semibold text-brand-copper hover:underline">
            Apply to drive
          </Link>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Access driver app</CardTitle>
          <CardDescription>Sign in with your approved driver account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driverEmail">Email</Label>
            <Input
              id="driverEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="driver@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverPassword">Password</Label>
            <Input
              id="driverPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </div>
          {loginMutation.error ? <p className="text-sm text-red-600">{loginMutation.error.message}</p> : null}
          <Button
            className="w-full"
            disabled={loginMutation.isPending || !email || !password}
            onClick={() => loginMutation.mutate({ email, password })}
          >
            Sign in
          </Button>
          <p className="text-sm text-brand-ink/60">
            Need an account?{" "}
            <Link to="/driver/signup" className="font-semibold text-brand-copper hover:underline">
              Apply to drive
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
