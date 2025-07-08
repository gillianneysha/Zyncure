import React from "react";

export default function ActionModal({
  open,
  icon,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  hideCancel = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl px-8 py-7 w-full max-w-xs text-center shadow-2xl border relative">
        {icon && <div className="flex justify-center mb-2">{icon}</div>}
        <div className="font-bold text-xl mb-2" style={{ color: "#15907C" }}>{title}</div>
        {message && <div className="mb-6 text-gray-700 text-sm">{message}</div>}
        <div className="flex flex-col gap-2">
          <button
            className="bg-[#E36464] hover:bg-[#c64a4a] text-white rounded-full py-2 font-semibold text-base transition-colors"
            onClick={onConfirm}
            data-testid="action-modal-confirm"
          >
            {confirmLabel}
          </button>
          {!hideCancel && (
            <button
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-full py-2 font-semibold text-base transition-colors"
              onClick={onCancel}
              data-testid="action-modal-cancel"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}