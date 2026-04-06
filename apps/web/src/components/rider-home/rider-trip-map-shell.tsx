import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock3, CreditCard, MapPin, Navigation, Route, Users } from "lucide-react";
import type { Ride } from "@shared/contracts";
import { Link } from "react-router-dom";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { RideTimeline } from "@/components/ride/ride-timeline";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";

type ShellAction = {
  label: string;
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "muted";
  to?: string;
  href?: string;
};

function ShellStat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[1rem] border border-white/8 bg-white/[0.04] p-3 shadow-[0_14px_36px_rgba(2,6,23,0.2)]">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-3.5 w-3.5 text-teal-300" />
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-2 text-[12px] font-semibold text-white">{value}</p>
    </div>
  );
}

function ShellActionButton({ action }: { action: ShellAction }) {
  const className = cn(
    "inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[11px] font-semibold transition",
    action.tone === "primary"
      ? "border-teal-400/28 bg-teal-400/14 text-teal-100 hover:bg-teal-400/18"
      : action.tone === "secondary"
        ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
        : "border-white/8 bg-slate-950/56 text-slate-300 hover:bg-white/[0.07] hover:text-white"
  );

  const content = (
    <>
      <action.icon className="mr-1.5 h-3.5 w-3.5" />
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <a href={action.href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link to={action.to ?? "/"} className={className}>
      {content}
    </Link>
  );
}

export function RiderTripMapShell({
  ride,
  title,
  subtitle,
  supportCopy,
  actions,
  extra,
  queueLabel,
  statusToneClassName,
  statusToneLabel,
  statusToneDetail
}: {
  ride: Ride;
  title: string;
  subtitle: string;
  supportCopy: string;
  actions: ShellAction[];
  extra?: ReactNode;
  queueLabel: string;
  statusToneClassName: string;
  statusToneLabel: string;
  statusToneDetail: string;
}) {
  return (
    <div className="-mx-3 md:hidden">
      <div className="relative isolate min-h-[calc(100dvh-9.6rem)] overflow-hidden rounded-[2.1rem] bg-slate-950 shadow-[0_32px_100px_rgba(2,6,23,0.58)] ring-1 ring-white/10">
        <DeferredLiveMap
          ride={ride}
          title={title}
          height={760}
          meta={subtitle}
          surfaceChrome="bare"
          fitPaddingBottom={336}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto flex max-w-[74%] flex-col gap-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-3.5 py-2 shadow-[0_18px_44px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
                <span className="h-2 w-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/45" />
                <span className="truncate text-sm font-medium text-white">{title}</span>
              </div>
              <div className="rounded-full border border-white/8 bg-slate-950/56 px-3.5 py-1.5 text-[11px] text-slate-300 shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-xl">
                <span className="block truncate">{ride.status.replaceAll("_", " ")}</span>
              </div>
            </div>

            <div className="pointer-events-auto shrink-0">
              <Badge className="border-white/10 bg-slate-950/68 px-3 py-2 text-[11px] text-white normal-case tracking-[0.02em]">
                {queueLabel}
              </Badge>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-20 px-3">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,29,0.68),rgba(6,10,18,0.92))] shadow-[0_24px_64px_rgba(2,6,23,0.48)] backdrop-blur-2xl">
            <div className="flex justify-center pb-1 pt-2">
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            <div className="max-h-[calc(100dvh-23rem)] overflow-y-auto overscroll-contain px-3.5 pb-3.5">
              <div className="border-b border-white/8 px-0.5 pb-2.5 pt-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p>
                    <h1 className="mt-1 truncate text-[1.08rem] font-semibold tracking-[-0.03em] text-white">{ride.rider.name}</h1>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-teal-300">{subtitle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge className={cn("border-white/10", statusToneClassName)}>{statusToneLabel}</Badge>
                    <p className="mt-1 max-w-[10rem] text-[10px] leading-4 text-slate-400">{statusToneDetail}</p>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  <ShellStat label="Stage" value={ride.status.replaceAll("_", " ")} icon={Navigation} />
                  <ShellStat label="Total" value={formatMoney(ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal ?? ride.payment.amountDue)} icon={Route} />
                  <ShellStat label="When" value={formatDateTime(ride.scheduledFor ?? ride.requestedAt)} icon={Clock3} />
                </div>
              </div>

              <div className="space-y-2.5 pt-2.5">
                <div className="rounded-[1.2rem] border border-teal-400/18 bg-teal-400/10 p-3.5">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-200">Pickup</p>
                      <p className="mt-1 truncate text-sm font-semibold text-white">{ride.pickup.address}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-200">Dropoff</p>
                      <p className="mt-1 truncate text-[11px] text-slate-300">{ride.dropoff.address}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1.05rem] border border-white/8 bg-white/[0.04] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Driver</p>
                    <p className="mt-1 text-[12px] font-semibold text-white">{ride.driver?.name ?? "Waiting for assignment"}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">{ride.driver?.vehicle?.makeModel ?? "Dispatching nearby drivers"}</p>
                  </div>
                  <div className="rounded-[1.05rem] border border-white/8 bg-white/[0.04] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payment</p>
                    <p className="mt-1 text-[12px] font-semibold text-white">{formatPaymentMethod(ride.payment.method)}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">{ride.payment.status}</p>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-3.5">
                  <RideTimeline ride={ride} compact />
                </div>

                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-slate-300">
                    <Users className="h-3.5 w-3.5 text-teal-300" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Status clarity</p>
                  </div>
                  <p className="text-[12px] leading-5 text-slate-300">{supportCopy}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-slate-950/56 px-2.5 py-1 text-[10px] text-slate-400">
                    <CreditCard className="h-3.5 w-3.5 text-teal-300" />
                    {formatPaymentMethod(ride.payment.method)} · {ride.payment.status}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {actions.map((action) => (
                    <ShellActionButton key={action.label} action={action} />
                  ))}
                </div>

                {extra}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}