import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Copy, Trash2, Plus, ShieldCheck } from "lucide-react";
import type { ApiKey, CreateApiKeyInput, ApiKeyScope } from "@shared/contracts";
import { PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const ALL_SCOPES: ApiKeyScope[] = [
  "rides:read",
  "drivers:read",
  "pricing:read",
  "reports:read",
  "webhooks:write"
];

function ScopeBadge({ scope }: { scope: ApiKeyScope }) {
  const tone: Record<ApiKeyScope, string> = {
    "rides:read": "bg-blue-500/15 text-blue-400",
    "drivers:read": "bg-purple-500/15 text-purple-400",
    "pricing:read": "bg-yellow-500/15 text-yellow-400",
    "reports:read": "bg-green-500/15 text-green-400",
    "webhooks:write": "bg-red-500/15 text-red-400"
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider", tone[scope])}>
      {scope}
    </span>
  );
}

function CreateKeyDialog({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (plaintext: string) => void;
}) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(["rides:read"]);
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (input: CreateApiKeyInput) => api.createApiKey(input, token!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-api-keys"] });
      onCreated(res.plaintext);
    },
    onError: () => setErr("Failed to create API key. Try again.")
  });

  function toggleScope(scope: ApiKeyScope) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-ops-surface border border-ops-border rounded-xl shadow-2xl p-6 w-full max-w-md space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-ops-overlay flex items-center justify-center">
            <KeyRound className="h-4 w-4 text-ops-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold">New API Key</p>
            <p className="text-xs text-ops-muted">Keys are shown once. Store them securely.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-ops-muted uppercase tracking-widest">Label</label>
          <input
            type="text"
            className="w-full bg-ops-overlay border border-ops-border rounded-lg px-3 py-2 text-sm placeholder:text-ops-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Partner integration — Lyft"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-ops-muted uppercase tracking-widest">Scopes</label>
          <div className="flex flex-wrap gap-2">
            {ALL_SCOPES.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => toggleScope(scope)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border transition-colors",
                  selectedScopes.includes(scope)
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-ops-border text-ops-muted hover:border-ops-border-soft"
                )}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!label.trim() || selectedScopes.length === 0 || createMut.isPending}
            onClick={() => createMut.mutate({ label: label.trim(), scopes: selectedScopes })}
          >
            {createMut.isPending ? "Creating…" : "Create key"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlaintextDialog({ plaintext, onClose }: { plaintext: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(plaintext).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-ops-surface border border-ops-border rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-5">
        <div className="flex items-center gap-3 text-green-400">
          <ShieldCheck className="h-5 w-5" />
          <p className="text-sm font-semibold">API key created — copy it now</p>
        </div>
        <p className="text-xs text-ops-muted">
          This is the only time the key value is shown. It cannot be retrieved after you close this dialog.
        </p>
        <div className="flex items-center gap-2 bg-ops-overlay rounded-lg p-3 border border-ops-border font-mono text-xs break-all">
          <span className="flex-1 select-all">{plaintext}</span>
          <button
            type="button"
            onClick={copy}
            className="ml-2 shrink-0 text-ops-muted hover:text-ops-front transition-colors"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        {copied && <p className="text-xs text-green-400">Copied to clipboard!</p>}
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function KeyRow({ apiKey }: { apiKey: ApiKey }) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const revokeMut = useMutation({
    mutationFn: () => api.revokeApiKey(token!, apiKey.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-api-keys"] })
  });

  const isRevoked = Boolean(apiKey.revokedAt);

  return (
    <div className={cn("flex items-start gap-4 py-4 border-b border-ops-border-soft last:border-0", isRevoked && "opacity-50")}>
      <div className="h-9 w-9 rounded-full bg-ops-overlay flex items-center justify-center shrink-0">
        <KeyRound className="h-4 w-4 text-ops-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate">{apiKey.label}</span>
          {isRevoked && <Badge className="border-red-500/20 bg-red-500/15 text-[10px] text-red-400">Revoked</Badge>}
        </div>
        <p className="text-xs text-ops-muted font-mono mb-1.5">{apiKey.keyPrefix}…</p>
        <div className="flex flex-wrap gap-1 mb-1">
          {apiKey.scopes.map((s) => (
            <ScopeBadge key={s} scope={s as ApiKeyScope} />
          ))}
        </div>
        <p className="text-xs text-ops-muted">
          Created {new Date(apiKey.createdAt).toLocaleDateString()}
          {apiKey.lastUsedAt && ` · Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`}
          {apiKey.revokedAt && ` · Revoked ${new Date(apiKey.revokedAt).toLocaleDateString()}`}
        </p>
      </div>
      {!isRevoked && (
        <div className="shrink-0">
          {confirming ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-400">Revoke?</span>
              <Button
                className="bg-red-500/90 text-white hover:bg-red-500"
                disabled={revokeMut.isPending}
                onClick={() => revokeMut.mutate()}
              >
                Yes
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>No</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminApiKeysPage() {
  const { token } = useAuth();
  const [creating, setCreating] = useState(false);
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: () => api.listApiKeys(token!),
    enabled: Boolean(token)
  });

  const keys = keysQuery.data?.keys ?? [];
  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <SurfaceHeader
        eyebrow="Admin — Integrations"
        title="API Keys"
        description="Manage third-party access via scoped API keys. Keys authenticate with X-Api-Key header."
        aside={
          <div className="flex justify-end">
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New key
            </Button>
          </div>
        }
      />

      {creating && (
        <CreateKeyDialog
          onClose={() => setCreating(false)}
          onCreated={(pt) => { setCreating(false); setNewPlaintext(pt); }}
        />
      )}

      {newPlaintext && (
        <PlaintextDialog plaintext={newPlaintext} onClose={() => setNewPlaintext(null)} />
      )}

      <PanelSection title={`Active keys (${activeKeys.length})`}>
        {keysQuery.isLoading && <p className="text-sm text-ops-muted animate-pulse py-4">Loading…</p>}
        {!keysQuery.isLoading && activeKeys.length === 0 && (
          <p className="text-sm text-ops-muted py-6 text-center">No active keys. Create one to begin.</p>
        )}
        {activeKeys.map((k) => <KeyRow key={k.id} apiKey={k} />)}
      </PanelSection>

      {revokedKeys.length > 0 && (
        <PanelSection title={`Revoked keys (${revokedKeys.length})`} description="Kept for audit history.">
          {revokedKeys.map((k) => <KeyRow key={k.id} apiKey={k} />)}
        </PanelSection>
      )}
    </div>
  );
}

export default AdminApiKeysPage;
