import React, { useState, useEffect, useRef } from "react";

function CreateFolderModal({
  open,
  onCreate,
  onClose,
  label = "Create Folder",
  placeholder = "Enter folder name",
  confirmLabel = "Create",
  cancelLabel = "Cancel",
}) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { if (open) setName(""); }, [open]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (name && name.trim()) onCreate(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl px-8 py-7 w-full max-w-xs text-center shadow-2xl border relative">
       
        <div className="font-bold text-xl mb-2" style={{ color: "#15907C" }}>{label}</div>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center mb-4">
            <input
              ref={inputRef}
              className="border border-gray-300 rounded-md w-full p-2 text-base"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={placeholder}
              maxLength={60}
              data-testid="create-folder-modal-input"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="bg-[#15907C] hover:bg-[#127e6d] text-white rounded-full py-2 font-semibold text-base transition-colors"
              data-testid="create-folder-modal-confirm"
              disabled={!name || name.trim() === ""}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-full py-2 font-semibold text-base transition-colors"
              onClick={onClose}
              data-testid="create-folder-modal-cancel"
            >
              {cancelLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateFolderModal;