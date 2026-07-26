"use client";

import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="md">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-sm text-ink-muted">{description}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
            danger ? "bg-rose-500 hover:bg-rose-500/90" : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          {loading ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
