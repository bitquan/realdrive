import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const styles: Record<ButtonVariant, string> = {
  default: "border border-ops-primary/45 bg-ops-primary text-white shadow-glow hover:bg-[#6887ff]",
  outline:
    "border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] text-ops-text hover:border-ops-primary/35 hover:bg-ops-panel",
  ghost: "border border-transparent bg-transparent text-ops-muted hover:border-ops-border-soft hover:bg-ops-panel/72 hover:text-ops-text"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
