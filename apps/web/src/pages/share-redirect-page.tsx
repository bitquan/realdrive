import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function ShareRedirectPage() {
  const navigate = useNavigate();
  const { referralCode = "" } = useParams();

  useEffect(() => {
    if (!referralCode) {
      void navigate("/", { replace: true });
      return;
    }

    void navigate(`/?ref=${encodeURIComponent(referralCode)}`, { replace: true });
  }, [navigate, referralCode]);

  return (
    <div className="rounded-4xl border border-brand-ink/10 bg-white p-8 text-sm text-brand-ink/55">
      Redirecting to the rider booking page...
    </div>
  );
}
