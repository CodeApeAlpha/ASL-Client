"use client";

import { useState } from "react";
import CheckIcon from "@mui/icons-material/Check";

type CheckboxProps = {
  label: string;
  checked?: boolean;
  onChange?: (nextChecked: boolean) => void;
};

export default function Checkbox({ label, checked: controlledChecked, onChange }: CheckboxProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = useState(true);
  const checked = controlledChecked ?? uncontrolledChecked;

  function handleClick() {
    const nextChecked = !checked;
    if (controlledChecked === undefined) {
      setUncontrolledChecked(nextChecked);
    }
    onChange?.(nextChecked);
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 group"
    >
      <div
        className={`w-4 h-4 rounded flex items-center justify-center transition-colors text-[10px] ${
          checked
            ? "bg-blue-500 text-white"
            : "border border-white/20 text-transparent group-hover:border-white/40"
        }`}
      >
        <CheckIcon color="inherit" fontSize="inherit" />
      </div>
      <span className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors select-none">
        {label}
      </span>
    </button>
  );
}
