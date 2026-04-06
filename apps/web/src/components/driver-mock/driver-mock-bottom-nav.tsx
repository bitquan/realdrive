import { Clock3, DollarSign, Navigation, UserRound } from "lucide-react";

const items = [
  { label: "Live", Icon: Navigation, active: true },
  { label: "History", Icon: Clock3, active: false },
  { label: "Earnings", Icon: DollarSign, active: false },
  { label: "Account", Icon: UserRound, active: false }
];

export function DriverMockBottomNav() {
  return (
    <div className="border-t border-slate-800/50 bg-slate-950/95 backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        {items.map(({ label, Icon, active }) => (
          <button
            key={label}
            type="button"
            className={active ? "flex flex-col items-center gap-1 text-teal-400" : "flex flex-col items-center gap-1 text-slate-500 transition-colors hover:text-slate-300"}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
