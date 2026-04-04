import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";

export function AdminInviteAcceptPage() {
  const navigate = useNavigate();
  const { token: inviteToken = "" } = useParams();
  const { user, acceptAdminInvite } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const mutation = useMutation({
    mutationFn: acceptAdminInvite,
    onSuccess: () => {
      void navigate("/admin");
    }
  });

  if (user?.roles.includes("admin")) {
    return <Navigate to="/admin" replace />;
  }

  const passwordsMatch = form.password === form.confirmPassword;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteToken || !form.name || !form.email || form.password.length < 8 || !passwordsMatch || mutation.isPending) {
      return;
    }

    mutation.mutate({
      token: inviteToken,
      name: form.name,
      email: form.email,
      password: form.password
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-ops-border-soft bg-ops-panel/70 p-3 text-ops-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Accept admin invite</CardTitle>
              <CardDescription>Create your trusted operator account with Admin, Driver, and Rider access for this RealDrive workspace.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="inviteName">Full name</Label>
              <Input
                id="inviteName"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Partner admin name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="partner@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitePassword">Password</Label>
              <Input
                id="invitePassword"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteConfirmPassword">Confirm password</Label>
              <Input
                id="inviteConfirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                placeholder="Repeat password"
              />
            </div>
            {!passwordsMatch ? <p className="text-sm text-ops-error">Passwords do not match.</p> : null}
            {mutation.error ? <p className="text-sm text-ops-error">{mutation.error.message}</p> : null}
            <Button className="w-full" type="submit" disabled={mutation.isPending || !inviteToken || !passwordsMatch}>
              Create trusted operator account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
