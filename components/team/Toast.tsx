"use client";

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-xl bg-red-800 px-4 py-3 text-base font-semibold text-white shadow-lg"
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message" className="min-h-11 min-w-11 rounded-lg bg-red-950 px-3">
        OK
      </button>
    </div>
  );
}
