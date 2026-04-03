import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Label({ className, ...props }) {
    return (_jsx("label", { className: cn("text-sm font-semibold text-brand-ink/80", className), ...props }));
}
