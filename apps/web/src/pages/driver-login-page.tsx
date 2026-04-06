import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock3, Route, ShieldCheck, Wallet } from "lucide-react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormActions, FormField, FormLayout } from "@/components/ui/form-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export function DriverLoginPage() {
  const navigate = useNavigate();
  const { user, loginDriver } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginDriver,
    onSuccess: () => {
      toast.success("Signed in", "Driver session is active.");
      void navigate("/driver");
    },
    onError: (error) => {
      toast.error("Sign-in failed", error instanceof Error ? error.message : "Unable to sign in.");
    }
  });

  if (userHasRole(user, "driver")) {
    return <Navigate to="/driver" replace />;
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
      eyebrow="Driver access"
      title="Driver sign in"
      description="Approved drivers sign in with email and password to open live offers, trip controls, dues status, and dispatch-ready tools from one mobile-first cockpit."
      highlights={[
        {
          title: "Live offers first",
          description: "Open current work, active ride state, and fast triage without digging through menus.",
          icon: Route
        },
        {
          title: "Approval aware",
          description: "Driver access stays tied to the real approval flow already managed by admin review.",
          icon: ShieldCheck
        },
        {
          title: "Mobile-ready layout",
          description: "The sign-in page stays tuned for phone screens and quick dispatch access.",
          icon: Clock3
        },
        {
          title: "Same payout context",
          description: "Dues, payment readiness, and ride work stay inside the same live driver surface.",
          icon: Wallet
        }
      ]}
      helper={(
        <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/60 p-5 text-sm text-ops-muted">
          <p className="font-semibold text-ops-text">No account yet?</p>
          <p className="mt-2">New driver accounts begin in pending status and unlock after admin approval.</p>
          <Link to="/driver/signup" className="mt-3 inline-flex font-semibold text-ops-primary hover:underline">
            Apply to drive
          </Link>
        </div>
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle>Access driver app</CardTitle>
          <CardDescription>Sign in with your approved driver account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FormLayout>
              <FormField label="Email" htmlFor="driverEmail">
                <Input
                  id="driverEmail"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="driver@example.com"
                />
              </FormField>
              <FormField label="Password" htmlFor="driverPassword">
                <Input
                  id="driverPassword"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                />
              </FormField>
              {loginMutation.error ? <p className="text-sm text-ops-error">{loginMutation.error.message}</p> : null}
              <FormActions className="flex-col sm:flex-row">
                <Button className="w-full sm:w-auto" type="submit" disabled={loginMutation.isPending || !email || !password}>
                  Sign in
                </Button>
                <Link
                  to="/driver/signup"
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel sm:w-auto"
                >
                  Apply to drive
                </Link>
              </FormActions>
              <p className="text-sm text-ops-muted">Need an account? Use Apply to drive.</p>
            </FormLayout>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
