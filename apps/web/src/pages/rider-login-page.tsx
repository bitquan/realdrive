import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CarFront, Clock3, Shield, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormActions, FormField, FormLayout } from "@/components/ui/form-layout";
import { Input } from "@/components/ui/input";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export function RiderLoginPage() {
  const navigate = useNavigate();
  const { user, requestOtp, verifyOtp } = useAuth();
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: requestOtp,
    onSuccess: (result) => {
      setRequested(true);
      setDevCode(result.devCode ?? null);
      toast.success(
        "Verification sent",
        result.devCode ? `Use code ${result.devCode} in local or test mode.` : "Enter the one-time code to open your rider account."
      );
    },
    onError: (error) => {
      toast.error("Unable to send code", error instanceof Error ? error.message : "Please try again.");
    }
  });

  const verifyMutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: () => {
      toast.success("Signed in", "Your rider account is ready.");
      void navigate("/rider/rides");
    },
    onError: (error) => {
      toast.error("Verification failed", error instanceof Error ? error.message : "Please check the code and try again.");
    }
  });

  if (userHasRole(user, "rider")) {
    return <Navigate to="/rider/rides" replace />;
  }

  function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestMutation.isPending || !phone.trim()) {
      return;
    }

    requestMutation.mutate({
      phone: phone.trim(),
      role: "rider"
    });
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifyMutation.isPending || !phone.trim() || !code.trim()) {
      return;
    }

    verifyMutation.mutate({
      phone: phone.trim(),
      code: code.trim(),
      role: "rider",
      name: name.trim() || undefined
    });
  }

  return (
    <AuthPageShell
      eyebrow="Rider access"
      title="Sign in for your rider side"
      description="Returning riders can unlock trip history, live ride follow-up, and share tools with a fast phone-based sign-in flow while guest booking stays open on the public home page."
      highlights={[
        {
          title: "Fast phone sign-in",
          description: "Use a one-time code instead of a password so riders can get back in quickly on mobile.",
          icon: Clock3
        },
        {
          title: "Same live trip tools",
          description: "Open active rides, history, payment context, and follow-up links from one rider queue.",
          icon: CarFront
        },
        {
          title: "Trust-first entry",
          description: "Keep access simple without exposing driver or admin controls on the rider path.",
          icon: Shield
        },
        {
          title: "Guest booking still open",
          description: "New riders can still book without an account, then return later to sign in and view trip history.",
          icon: Sparkles
        }
      ]}
      helper={(
        <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/60 p-5 text-sm text-ops-muted">
          <p className="font-semibold text-ops-text">Need a ride right now?</p>
          <p className="mt-2">Guest booking stays live on the home page, so you can still request a ride without stopping to create an account first.</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Link to="/" className="inline-flex font-semibold text-ops-primary hover:underline">
              Book on home page
            </Link>
            <Link to="/driver/login" className="inline-flex font-semibold text-ops-primary hover:underline">
              Driver sign in
            </Link>
          </div>
        </div>
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle>{requested ? "Verify your code" : "Open rider account"}</CardTitle>
          <CardDescription>
            {requested
              ? "Enter the one-time code sent to your phone. Add your name if this is your first rider session."
              : "Enter your phone number to get a one-time code for your rider account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={requested ? submitCode : submitPhone}>
            <FormLayout>
              <FormField label="Phone number" htmlFor="riderPhoneLogin" hint="Use the same phone number you used for bookings or prior rider access.">
                <Input
                  id="riderPhoneLogin"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(555) 555-5555"
                />
              </FormField>

              {requested ? (
                <>
                  <FormField label="Verification code" htmlFor="riderLoginCode" hint="Check your latest text message for the code.">
                    <Input
                      id="riderLoginCode"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="1234"
                    />
                  </FormField>
                  <FormField label="Name (optional)" htmlFor="riderLoginName" hint="Used when the rider profile is created for the first time.">
                    <Input
                      id="riderLoginName"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Jordan Smith"
                    />
                  </FormField>
                  {devCode ? (
                    <div className="rounded-3xl border border-ops-primary/25 bg-ops-primary/10 p-4 text-sm text-ops-muted">
                      Local/test code: <span className="font-semibold text-ops-text">{devCode}</span>
                    </div>
                  ) : null}
                </>
              ) : null}

              {requestMutation.error ? <p className="text-sm text-ops-error">{requestMutation.error.message}</p> : null}
              {verifyMutation.error ? <p className="text-sm text-ops-error">{verifyMutation.error.message}</p> : null}

              <FormActions className="flex-col sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  type="submit"
                  disabled={
                    requested
                      ? verifyMutation.isPending || !phone.trim() || !code.trim()
                      : requestMutation.isPending || !phone.trim()
                  }
                >
                  {requested ? (verifyMutation.isPending ? "Verifying..." : "Sign in") : requestMutation.isPending ? "Sending..." : "Send code"}
                </Button>
                {requested ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => requestMutation.mutate({ phone: phone.trim(), role: "rider" })}
                      disabled={requestMutation.isPending || !phone.trim()}
                    >
                      {requestMutation.isPending ? "Sending..." : "Resend code"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setRequested(false);
                        setCode("");
                        setDevCode(null);
                      }}
                    >
                      Change number
                    </Button>
                  </>
                ) : (
                  <Link
                    to="/"
                    className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel sm:w-auto"
                  >
                    Continue as guest
                  </Link>
                )}
              </FormActions>
              <p className="text-sm text-ops-muted">After sign-in, you will land in your rider trip queue.</p>
            </FormLayout>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}