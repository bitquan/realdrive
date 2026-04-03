import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Separator({ className }) {
    return _jsx("div", { className: cn("h-px w-full bg-brand-ink/10", className) });
}
