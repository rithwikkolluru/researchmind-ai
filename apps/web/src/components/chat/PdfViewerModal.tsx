"use client";

import { X } from "lucide-react";

interface PdfViewerModalProps {
  pdfUrl: string | null;
  onClose: () => void;
}

export default function PdfViewerModal({ pdfUrl, onClose }: PdfViewerModalProps) {
  if (!pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0f1117] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Document Preview</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label="Close document preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <iframe src={pdfUrl} title="PDF preview" className="h-[calc(85vh-49px)] w-full bg-white" />
      </div>
    </div>
  );
}
