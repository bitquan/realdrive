import { useCallback, useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AddressAutocompleteInput({
  id,
  value,
  onValueChange,
  placeholder,
  minQueryLength = 3,
  onOpenChange,
  className,
  inputClassName
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  minQueryLength?: number;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferredQuery = useDeferredValue(value.trim());

  function updateOpenState(next: boolean) {
    setIsOpen(next);
    onOpenChange?.(next);
  }

  const suggestionsQuery = useQuery({
    queryKey: ["address-suggestions", id, deferredQuery],
    queryFn: async () => {
      try {
        return await api.addressSuggestions(deferredQuery);
      } catch {
        return [];
      }
    },
    enabled: isOpen && deferredQuery.length >= minQueryLength,
    retry: false
  });

  const closeSuggestions = useCallback(() => {
    window.setTimeout(() => {
      updateOpenState(false);
    }, 120);
  }, []);

  const suggestions = isOpen ? (suggestionsQuery.data ?? []) : [];

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onFocus={() => updateOpenState(true)}
        onBlur={closeSuggestions}
        onChange={(event) => onValueChange(event.target.value)}
        className={inputClassName}
      />

      {isOpen && value.trim().length >= minQueryLength ? (
        <div className="relative z-20 mt-2 max-h-72 overflow-y-auto rounded-[1.1rem] border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.985),rgba(12,15,21,0.985))] p-1.5 shadow-elevated">
          {suggestionsQuery.isLoading ? (
            <p className="px-3 py-2 text-sm text-ops-muted">Searching addresses…</p>
          ) : suggestions.length ? (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onMouseDown={() => {
                  onValueChange(suggestion.address);
                  updateOpenState(false);
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] leading-5 text-ops-text transition hover:bg-ops-panel md:text-sm"
              >
                {suggestion.address}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-ops-muted">No suggestions yet. Keep typing.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}