import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const styles: Record<ButtonVariant, string> = {
  default: "border border-ops-primary/45 bg-ops-primary text-white shadow-glow hover:bg-[#3b8fff]",
  outline: "border border-ops-border bg-gradient-to-b from-ops-panel/75 to-[#111a2a] text-ops-text hover:bg-ops-panel",
  ghost: "bg-transparent text-ops-muted hover:bg-ops-surface hover:text-ops-text"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
