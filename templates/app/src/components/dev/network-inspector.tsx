"use client";

import { Trash2, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import {
  clearNetLog,
  getNetLog,
  type NetLogEntry,
  subscribeNetLog,
} from "@/lib/http/net-log";
import { cn } from "@/lib/utils";

/**
 * DEV-ONLY floating network inspector — the web analog of Chucker.
 *
 * Every backend call (via `backendClient`) lands here so you can see method,
 * path, status, timing, and the request/response bodies without opening the
 * browser's Network tab. Failed calls also raise a toast, so a broken request
 * announces itself instead of hiding in a panel you have to remember to open.
 *
 * Mounted only in development (see `components/dev/dev-tools.tsx`); it renders
 * nothing in production and the whole module tree-shakes out of that bundle.
 */
export function NetworkInspector() {
  const entries = useSyncExternalStore(subscribeNetLog, getNetLog, getNetLog);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const failedCount = useMemo(
    () => entries.filter((e) => !e.ok).length,
    [entries],
  );

  // Toast each newly-failed call once — even while the panel is closed. On first
  // mount we only baseline the seen id so pre-existing failures don't all fire.
  const seenId = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    const newestId = entries[0]?.id ?? 0;
    if (!mounted.current) {
      mounted.current = true;
      seenId.current = newestId;
      return;
    }
    const fresh = entries.filter((e) => e.id > seenId.current);
    seenId.current = newestId;
    for (const entry of fresh) {
      if (entry.ok) continue;
      toast.error(`${entry.method} ${entry.path}`, {
        description: `${entry.status ?? "network"} · ${entry.errorMessage ?? "Request failed"}`,
      });
    }
  }, [entries]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open network inspector"
        className="fixed bottom-16 left-4 z-[9998] flex h-9 items-center gap-2 rounded-full bg-zinc-900 pr-3.5 pl-3 font-mono text-xs text-zinc-100 shadow-lg ring-1 ring-white/10 transition-transform hover:scale-105"
      >
        <span className="relative flex size-2">
          <span
            className={cn(
              "size-2 rounded-full",
              failedCount > 0 ? "bg-red-500" : "bg-emerald-500",
            )}
          />
          {failedCount > 0 ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500" />
          ) : null}
        </span>
        NET
        <span className="text-zinc-400">{entries.length}</span>
        {failedCount > 0 ? (
          <span className="rounded-full bg-red-500/20 px-1.5 text-red-300">
            {failedCount}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="fixed bottom-16 left-4 z-[9998] flex h-[32rem] max-h-[85vh] w-[26rem] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-zinc-900 font-mono text-xs text-zinc-100 shadow-2xl ring-1 ring-white/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide">NETWORK</span>
          <span className="text-zinc-500">
            {entries.length} · {failedCount} failed
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              clearNetLog();
              setSelectedId(null);
            }}
            aria-label="Clear log"
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          >
            <Trash2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close network inspector"
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body: list, or detail when a row is selected */}
      {selected ? (
        <CallDetail entry={selected} onBack={() => setSelectedId(null)} />
      ) : entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-zinc-500">
          No calls yet. Trigger a request and it shows up here.
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setSelectedId(entry.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5"
              >
                <StatusChip entry={entry} />
                <span className="w-9 shrink-0 text-zinc-400">
                  {entry.method}
                </span>
                <span className="flex-1 truncate text-zinc-200">
                  {entry.path}
                </span>
                <span className="shrink-0 text-zinc-500">
                  {entry.durationMs}ms
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusChip({ entry }: { entry: NetLogEntry }) {
  const label = entry.status ?? "ERR";
  return (
    <span
      className={cn(
        "w-9 shrink-0 rounded px-1 text-center tabular-nums",
        entry.ok
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-red-500/15 text-red-300",
      )}
    >
      {label}
    </span>
  );
}

function CallDetail({
  entry,
  onBack,
}: {
  entry: NetLogEntry;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-zinc-900/95 px-3 py-2 text-left text-zinc-300 backdrop-blur hover:text-zinc-100"
      >
        ← Back
      </button>

      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2">
          <StatusChip entry={entry} />
          <span className="text-zinc-400">{entry.method}</span>
          <span className="text-zinc-500">{entry.durationMs}ms</span>
        </div>
        <div className="break-all text-zinc-200">{entry.path}</div>
        <div className="text-zinc-500">
          {new Date(entry.startedAt).toLocaleTimeString()}
          {entry.errorKind ? ` · ${entry.errorKind} error` : ""}
        </div>

        {entry.errorMessage ? (
          <Section label="Error">
            <div className="text-red-300">{entry.errorMessage}</div>
          </Section>
        ) : null}

        {entry.requestBody !== undefined ? (
          <Section label="Request">
            <JsonBlock value={entry.requestBody} />
          </Section>
        ) : null}

        <Section label="Response">
          <JsonBlock value={entry.response} />
        </Section>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[0.65rem] tracking-widest text-zinc-500 uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const text = useMemo(() => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-black/40 p-2 text-[0.7rem] leading-relaxed whitespace-pre-wrap text-zinc-300">
      {text}
    </pre>
  );
}
