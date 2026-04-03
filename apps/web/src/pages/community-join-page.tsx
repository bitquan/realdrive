import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export function CommunityJoinPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { exchangeCommunityAccess } = useAuth();
  const [started, setStarted] = useState(false);

  const exchangeMutation = useMutation({
    mutationFn: exchangeCommunityAccess,
    onSuccess: () => {
      void navigate("/community", { replace: true });
    }
  });

  useEffect(() => {
    if (!token || started) {
      return;
    }

    setStarted(true);
    exchangeMutation.mutate({ token });
  }, [exchangeMutation, started, token]);

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Opening your community board</CardTitle>
          <CardDescription>
            This rider link signs you into the community board without OTP so you can keep the same access later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exchangeMutation.isPending || !started ? (
            <p className="text-sm text-brand-ink/60">Checking your community access token now...</p>
          ) : null}
          {exchangeMutation.error ? (
            <>
              <p className="text-sm text-red-600">{exchangeMutation.error.message}</p>
              <div className="flex gap-3">
                <Button onClick={() => exchangeMutation.mutate({ token })}>Try again</Button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60"
                >
                  Back home
                </Link>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
