export function SmsHelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-ops-border-soft bg-ops-surface p-6 text-sm text-ops-muted shadow-soft sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-ops-text">RealDrive SMS Help</h1>
        <p>If you need help with RealDrive text messages, use the instructions below.</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">SMS commands</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Reply <span className="font-semibold text-ops-text">HELP</span> for assistance.</li>
          <li>Reply <span className="font-semibold text-ops-text">STOP</span> to unsubscribe.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">Support contact</h2>
        <p>Email: support@realdrive.app</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ops-text">Service notes</h2>
        <p>Message frequency varies by ride activity. Message and data rates may apply.</p>
      </section>
    </div>
  );
}
