import { useState } from "react";
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
    queryFn: api.adminSetupStatus
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

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Admin sign-in</CardTitle>
          <CardDescription>Use the admin account you created during the one-time setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email</Label>
            <Input
              id="adminEmail"
              type="email"
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
        </CardContent>
      </Card>
    </div>
  );
}
