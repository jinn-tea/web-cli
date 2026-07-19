"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop file input with a keyboard-reachable fallback.
 *
 * The hidden `<input type="file">` is deliberate: a drop zone alone is
 * unusable by keyboard and invisible to assistive tech, so the real input stays
 * in the DOM and the styled area is its label. Dragging is the enhancement, not
 * the mechanism.
 *
 * Size and type are checked HERE for immediate feedback, but that is a
 * courtesy, not a control — the server must validate them too.
 */
export interface FileDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function FileDropzone({
  value,
  onChange,
  accept,
  maxBytes = 5 * 1024 * 1024,
  disabled,
  id = "file",
  className,
}: FileDropzoneProps) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept_ = (file: File): boolean => {
    if (file.size > maxBytes) {
      setError(t("validation.maxLength"));
      return false;
    }
    setError(null);
    return true;
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (accept_(file)) onChange(file);
  };

  if (value) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
          className,
        )}
      >
        {/* min-w-0 + truncate: filenames are user data and often very long. */}
        <div className="min-w-0">
          <p className="text-label truncate">{value.name}</p>
          <p className="text-caption text-muted-foreground">
            {formatBytes(value.size)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label={t("common.actions.clear")}
          disabled={disabled}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed p-6 text-center transition-colors",
          isOver && "border-primary bg-accent",
          disabled && "opacity-60",
        )}
      >
        <Upload
          className="text-muted-foreground mx-auto mb-2 size-5"
          aria-hidden="true"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {t("common.actions.create")}
        </Button>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(event) => handleFiles(event.target.files)}
          className="sr-only"
        />
      </div>
      {error ? (
        <p
          className="text-caption text-danger-subtle-foreground mt-1.5"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
