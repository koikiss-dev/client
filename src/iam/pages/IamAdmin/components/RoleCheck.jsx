import React from "react";

export default function RoleCheck({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-neutral-400 text-blue-600 focus:ring-blue-500 dark:border-neutral-600"
        aria-label={label}
      />
    </label>
  );
}
