"use client";

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-2xl border-4 border-white bg-coral-700 px-4 py-3 text-base font-bold text-white shadow-lg"
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message" className="min-h-11 min-w-11 rounded-xl bg-night-900 px-3 font-black">
        OK
      </button>
    </div>
  );
}
