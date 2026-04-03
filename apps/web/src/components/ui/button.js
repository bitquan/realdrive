import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const styles = {
    default: "bg-brand-ink text-white hover:bg-black",
    outline: "border border-brand-ink/15 bg-white text-brand-ink hover:bg-brand-sand/60",
    ghost: "bg-transparent text-brand-ink hover:bg-brand-ink/5"
};
export const Button = forwardRef(({ className, variant = "default", ...props }, ref) => (_jsx("button", { ref: ref, className: cn("inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", styles[variant], className), ...props })));
Button.displayName = "Button";
