import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loginAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const setupStatusQuery = useQuery({
    queryKey: ["admin-setup-status"],
    queryFn: api.adminSetupStatus,
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: () => {
      void navigate("/admin");
    }
  });

  if (userHasRole(user, "admin")) {
    return <Navigate to="/admin" replace />;
  }

  if (setupStatusQuery.data?.needsSetup) {
    return <Navigate to="/admin/setup" replace />;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginMutation.isPending || !email || !password) {
      return;
    }
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Admin sign-in</CardTitle>
          <CardDescription>Use the admin account you created during the one-time setup or from an admin invite.</CardDescription>
        </CardHeader>
        <CardContent>
          {setupStatusQuery.error ? (
            <div className="mb-4 rounded-3xl border border-ops-error/25 bg-ops-error/10 p-4 text-sm text-ops-error">
              {setupStatusQuery.error.message}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email</Label>
            <Input
              id="adminEmail"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <Input
              id="adminPassword"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </div>
          {loginMutation.error ? <p className="text-sm text-ops-error">{loginMutation.error.message}</p> : null}
          <Button className="w-full" type="submit" disabled={loginMutation.isPending || !email || !password}>
            Sign in
          </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
