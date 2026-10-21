import { useState, useRef, useId } from "react";
import { Icon } from "./icons";
export function ThemedSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o[0] === value) || options[0];
  return (
    <div
      className="themed-select"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const index = options.findIndex((o) => o[0] === value),
              next =
                (index + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                options.length;
            onChange(options[next][0]);
          }
        }}
      >
        <span>{current[1]}</span>
        <Icon name="chevron" size={12} />
      </button>
      {open && (
        <div
          className="themed-select-menu"
          id={menuId}
          role="listbox"
          aria-label={label}
        >
          {options.map(([id, text]) => (
            <button
              type="button"
              key={id}
              role="option"
              aria-selected={value === id}
              onClick={() => {
                onChange(id);
                setOpen(false);
                root.current
                  ?.querySelector<HTMLButtonElement>('[role="combobox"]')
                  ?.focus();
              }}
            >
              {text}
              {value === id && <Icon name="check" size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
