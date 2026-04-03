import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navigate, Link, useNavigate } from "react-router-dom";
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
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Driver sign-in</CardTitle>
          <CardDescription>Approved drivers sign in with email and password after admin review.</CardDescription>
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
