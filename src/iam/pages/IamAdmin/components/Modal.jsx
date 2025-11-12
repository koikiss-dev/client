import React from "react";

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl fx-card bg-neutral-950/85">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="section-title text-lg">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-md bg-neutral-200 text-neutral-900 hover:brightness-105 dark:bg-neutral-800 dark:text-neutral-100"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="px-4 pb-4">{children}</div>
          {footer && <div className="px-4 pb-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
