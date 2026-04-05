import { Link } from "react-router-dom";

export function SmsConsentPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-ops-border-soft bg-ops-surface p-6 text-sm text-ops-muted shadow-soft sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-ops-text">RealDrive SMS Consent</h1>
        <p>
          RealDrive sends transactional ride updates by SMS to riders and drivers. This page explains what messages we send,
          how you opt in, and how to opt out.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">How opt-in works</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>You provide your phone number during account use or active ride participation.</li>
          <li>You request or accept ride-related actions that require status notifications.</li>
          <li>By continuing, you consent to receive ride-status SMS from RealDrive.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">Message types</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Driver new job offer notifications</li>
          <li>Rider notifications when a driver accepts, is en route, or arrives</li>
          <li>Ride completion and cancellation updates for rider and driver</li>
          <li>Account verification codes when applicable</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">Message frequency and fees</h2>
        <p>Message frequency varies by ride activity. Message and data rates may apply.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">STOP and HELP</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Reply <span className="font-semibold text-ops-text">STOP</span> to unsubscribe from SMS notifications.</li>
          <li>Reply <span className="font-semibold text-ops-text">HELP</span> for assistance.</li>
        </ul>
        <p>
          You can also visit the support page: <Link className="text-ops-accent underline" to="/sms-help">/sms-help</Link>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">Privacy</h2>
        <p>
          RealDrive uses SMS for operational ride communications. We do not use ride-status SMS consent for unrelated
          promotional campaigns.
        </p>
      </section>
    </div>
  );
}
