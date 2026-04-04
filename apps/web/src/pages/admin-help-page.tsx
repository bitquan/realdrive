import { BookOpen, CreditCard, Link2, ShieldCheck, Users } from "lucide-react";
import { MetricCard, MetricStrip, PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";

const faqSections = [
  {
    title: "How dues codes work",
    body:
      "Only completed trips create collectible dues. When you batch dues, the system freezes one exact code like #DUES000001 for that exact amount. Tell drivers to put that code in the payment title, note, or both when the payment app allows it."
  },
  {
    title: "Cash rider trips",
    body:
      "If a rider paid cash, the driver gets a dues code automatically as soon as that completed trip lands. That cash batch stays separate so you can reconcile it cleanly."
  },
  {
    title: "48-hour block rule",
    body:
      "If completed-trip dues sit unresolved for 48 hours, RealDrive auto-generates an overdue batch if needed, blocks the driver from going available, and keeps them out of new dispatch until you reconcile the batch."
  },
  {
    title: "Collector ownership",
    body:
      "Drivers recruited from your link default to your queue. Drivers from your partner's link default to theirs. You can still move a driver to another admin if ownership changes."
  },
  {
    title: "Reconciling payments",
    body:
      "For Cash App, Zelle, or Jim, look for the #DUES code in the payment title, note, or both. For cash or other off-app payments, add a required admin note before marking the batch paid."
  },
  {
    title: "Inviting another admin",
    body:
      "Create a trusted operator invite from Team, send the link to your partner, and they create one account with Admin, Driver, and Rider access right away. After that, they manage their own recruit links, dues queue, and payout instructions."
  }
];

export function AdminHelpPage() {
  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Admin guide"
        title="Collector playbook for dues, invites, and ownership"
        description="Use this guide when training a new admin collector or double-checking how RealDrive batches and reconciles completed-trip dues."
      />

      <MetricStrip>
        <MetricCard label="Completed trips only" value="Yes" meta="No incomplete ride ever generates collectible dues" icon={ShieldCheck} tone="success" />
        <MetricCard label="Reference format" value="#DUES000001" meta="Drivers should use it in title, note, or both" icon={CreditCard} />
        <MetricCard label="Recruit links" value="Owned" meta="Each admin can recruit directly into their own queue" icon={Link2} />
        <MetricCard label="Partner admins" value="Team" meta="Create trusted operator access from the Team tab" icon={Users} />
      </MetricStrip>

      <PanelSection
        title="How to use this"
        description="Share this page with any partner admin before they start reviewing drivers or collecting dues."
        actions={
          <span className="inline-flex items-center gap-2 rounded-2xl border border-ops-border px-4 py-2 text-sm font-semibold text-ops-text">
            <BookOpen className="h-4 w-4" />
            Live guide
          </span>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {faqSections.map((section) => (
            <div key={section.title} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
              <p className="text-base font-semibold text-ops-text">{section.title}</p>
              <p className="mt-3 text-sm leading-6 text-ops-muted">{section.body}</p>
            </div>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}
