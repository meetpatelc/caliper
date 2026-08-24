import type { ReactNode, RefObject } from "react";
import { Button } from "./button";
import { OverlayDialog } from "./overlay";

export function ConfirmDialog({
  open,
  onClose,
  title,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  restoreFocusTo,
  busy = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "accent";
  restoreFocusTo?: RefObject<HTMLElement | null>;
  busy?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <OverlayDialog open={open} onClose={onClose} title={title} titleMode="visible" restoreFocusTo={restoreFocusTo}>
      <div className="px-5 pb-5">
        {children ? <div className="mt-3 text-sm leading-6 text-muted">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === "danger" ? "accent" : "outline"} disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </OverlayDialog>
  );
}
