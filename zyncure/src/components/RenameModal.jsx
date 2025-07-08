import React, { useState, useEffect, useRef } from "react";

function getBaseNameAndExt(name) {
  if (!name) return { base: "", ext: "" };
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return { base: name, ext: "" }; // No extension or hidden file
  return { base: name.slice(0, lastDot), ext: name.slice(lastDot) };
}

function RenameModal({
  open,
  currentName,
  onRename,
  onClose,
  label = "Rename",
  placeholder = "Enter new name",
  type = "file", // pass 'file' or 'folder'
}) {
  // For files, separate base and extension
  const { base, ext } = getBaseNameAndExt(currentName || "");
  const [name, setName] = useState(type === "file" ? base : (currentName || ""));
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(type === "file" ? base : (currentName || ""));
    }
    // eslint-disable-next-line
  }, [open, currentName, type]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl px-8 py-7 w-full max-w-xs text-center shadow-2xl border relative">
        <div className="font-bold text-xl mb-2">{label}</div>
        <div className="flex items-center mb-4">
          <input
            ref={inputRef}
            className="border border-gray-300 rounded-md w-full p-2 text-base"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={placeholder}
            maxLength={60}
            data-testid="rename-modal-input"
            style={type === "file" ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 } : {}}
          />
          {type === "file" && ext && (
            <span className="bg-gray-100 border border-l-0 border-gray-300 px-2 py-2 h-full rounded-r-md text-gray-500 select-none text-base" style={{ minWidth: 50 }}>
              {ext}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            className="bg-[#15907C] hover:bg-[#127e6d] text-white rounded-full py-2 font-semibold text-base transition-colors"
            onClick={() => {
              if (name && name.trim() && (type === "file"
                ? (name.trim() + ext) !== currentName
                : name.trim() !== currentName
              )) {
                onRename(type === "file" ? (name.trim() + ext) : name.trim());
              }
            }}
            data-testid="rename-modal-confirm"
            disabled={
              !name ||
              name.trim() === "" ||
              (type === "file"
                ? (name.trim() + ext) === currentName
                : name.trim() === currentName)
            }
          >
            Save
          </button>
          <button
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-full py-2 font-semibold text-base transition-colors"
            onClick={onClose}
            data-testid="rename-modal-cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default RenameModal;