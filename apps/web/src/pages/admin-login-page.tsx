import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Settings2, ShieldCheck, Users } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormActions, FormField, FormLayout } from "@/components/ui/form-layout";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loginAdmin } = useAuth();
  const toast = useToast();
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
      toast.success("Signed in", "Admin session is active.");
      void navigate("/admin");
    },
    onError: (error) => {
      toast.error("Sign-in failed", error instanceof Error ? error.message : "Unable to sign in.");
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
    <AuthPageShell
      eyebrow="Admin access"
      title="Admin sign in"
      description="Use the operations account created during setup or accepted from an admin invite to manage dispatch, drivers, dues, pricing, and reports from one control layer."
      highlights={[
        {
          title: "Dispatch control",
          description: "Open the real dispatch queue, rider live state, and release timing from the same admin surface.",
          icon: LayoutDashboard
        },
        {
          title: "Secure ops access",
          description: "Admin entry stays tied to the real setup and invite system already in production.",
          icon: ShieldCheck
        },
        {
          title: "Driver governance",
          description: "Review team readiness, approvals, and dues without leaving the protected admin workspace.",
          icon: Users
        },
        {
          title: "Pricing and config",
          description: "Manage pricing, regions, API keys, and share tools from the same sign-in system.",
          icon: Settings2
        }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Access admin operations</CardTitle>
          <CardDescription>Use the admin account you created during the one-time setup or from an admin invite.</CardDescription>
        </CardHeader>
        <CardContent>
          {setupStatusQuery.error ? (
            <div className="mb-4 rounded-3xl border border-ops-error/25 bg-ops-error/10 p-4 text-sm text-ops-error">
              {setupStatusQuery.error.message}
            </div>
          ) : null}
          <form onSubmit={onSubmit}>
            <FormLayout>
              <FormField label="Email" htmlFor="adminEmail">
                <Input
                  id="adminEmail"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </FormField>
              <FormField label="Password" htmlFor="adminPassword">
                <Input
                  id="adminPassword"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                />
              </FormField>
              {loginMutation.error ? <p className="text-sm text-ops-error">{loginMutation.error.message}</p> : null}
              <FormActions>
                <Button className="w-full" type="submit" disabled={loginMutation.isPending || !email || !password}>
                  Sign in
                </Button>
              </FormActions>
            </FormLayout>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
