import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (input: Omit<ToastMessage, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function toastClasses(variant: ToastVariant) {
  if (variant === "success") {
    return "border-emerald-400/35 bg-emerald-500/12";
  }

  if (variant === "error") {
    return "border-ops-error/35 bg-ops-error/12";
  }

  return "border-ops-border-soft bg-ops-panel/95";
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (input: Omit<ToastMessage, "id">) => {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      setMessages((current) => [...current, { ...input, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push({ title, description, variant: "success" }),
      error: (title, description) => push({ title, description, variant: "error" }),
      info: (title, description) => push({ title, description, variant: "info" })
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] mx-auto flex w-full max-w-2xl flex-col gap-2 px-3 md:px-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "pointer-events-auto rounded-2xl border px-4 py-3 shadow-panel backdrop-blur",
              toastClasses(message.variant)
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ops-text">{message.title}</p>
                {message.description ? <p className="mt-1 text-xs text-ops-muted">{message.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(message.id)}
                aria-label="Dismiss notification"
                className="rounded-xl border border-ops-border-soft bg-ops-surface/90 p-1 text-ops-muted transition hover:text-ops-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
