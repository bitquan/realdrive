import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }) {
    return (_jsx("div", { className: cn("rounded-4xl border border-brand-ink/10 bg-white/95 shadow-soft backdrop-blur", className), ...props }));
}
export function CardHeader({ className, ...props }) {
    return _jsx("div", { className: cn("space-y-1 p-6 pb-3", className), ...props });
}
export function CardTitle({ className, ...props }) {
    return _jsx("h2", { className: cn("text-xl font-bold tracking-tight", className), ...props });
}
export function CardDescription({ className, ...props }) {
    return _jsx("p", { className: cn("text-sm text-brand-ink/55", className), ...props });
}
export function CardContent({ className, ...props }) {
    return _jsx("div", { className: cn("p-6 pt-3", className), ...props });
}
