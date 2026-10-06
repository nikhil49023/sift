import React, { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";

export default function EditorialDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = "",
}) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <dialog
      ref={ref}
      className={"editorial ed-dialog " + className}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <div>
            <p className="eyebrow">A CLOSER LOOK</p>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </header>
        <div className="dialog-content">{children}</div>
      </div>
    </dialog>
  );
}
