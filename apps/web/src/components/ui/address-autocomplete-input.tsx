import { useCallback, useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export function AddressAutocompleteInput({
  id,
  value,
  onValueChange,
  placeholder,
  minQueryLength = 3
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  minQueryLength?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferredQuery = useDeferredValue(value.trim());

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
      setIsOpen(false);
    }, 120);
  }, []);

  const suggestions = isOpen ? (suggestionsQuery.data ?? []) : [];

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onBlur={closeSuggestions}
        onChange={(event) => onValueChange(event.target.value)}
      />

      {isOpen && value.trim().length >= minQueryLength ? (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.98),rgba(12,15,21,0.98))] p-1 shadow-elevated">
          {suggestionsQuery.isLoading ? (
            <p className="px-3 py-2 text-sm text-ops-muted">Searching addresses…</p>
          ) : suggestions.length ? (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onMouseDown={() => {
                  onValueChange(suggestion.address);
                  setIsOpen(false);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-ops-text transition hover:bg-ops-panel"
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