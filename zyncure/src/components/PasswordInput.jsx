import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
  label = "Password",
  name = "password",
  value,
  onChange,
  placeholder = "Password",
  error,
  disabled = false,
  required = true,
  inputClassName = "",
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full mb-3">
      {label && (
        <label className="block mb-1 text-[#F5E0D9] text-left" htmlFor={name}>
          {label}:
        </label>
      )}
      <input
        id={name}
        type={showPassword ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`block w-full mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] pr-10 ${error ? "ring-2 ring-red-400" : ""} ${inputClassName}`}
        required={required}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        className="absolute right-3 top-12 -translate-y-1/2 flex items-center text-[#F46B5D] focus:outline-none"
        tabIndex={-1}
        style={{ padding: 0, background: "none", border: "none" }}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
      {error && (
        <p className="mb-2 text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}