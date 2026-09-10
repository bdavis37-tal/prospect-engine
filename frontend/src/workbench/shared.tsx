import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
export function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="wb-drawer"
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right) onClose();
        }
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Close detail">
          Close <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className="drawer-body">{children}</div>
    </dialog>,
    document.body,
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
