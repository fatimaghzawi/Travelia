"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { LegalDocumentContent } from "@/lib/constants/legal-content";
import { LegalDocument } from "./LegalDocument";

type LegalPanelProps = {
  document: LegalDocumentContent;
  onClose: () => void;
};

export function LegalPanel({ document, onClose }: LegalPanelProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute -inset-5 z-20 flex flex-col rounded-3xl bg-white sm:-inset-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-panel-title"
    >
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3 sm:px-6">
        <p id="legal-panel-title" className="text-sm font-semibold text-[#002642]">
          {document.title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#67717A] transition hover:bg-[#F4F6F8] hover:text-[#002642]"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
        <LegalDocument document={document} />
      </div>

      <div className="border-t border-[#E2E8F0] px-5 py-3 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f6b6f]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
