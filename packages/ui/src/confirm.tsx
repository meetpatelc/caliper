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
          {/*
            Cancel stays live while busy. It was disabled, which is backwards:
            the longer the work runs the more someone wants out, and AI drafting
            runs 60 to 90 seconds behind a button reading "Working…" with every
            control dead. That is not a confirmation dialog, it is a trap.

            It closes the dialog; it does not claim to abort the work. Anything
            already in flight finishes on its own, and a caller that must ignore
            a late result tracks that itself — which `draft-with-ai` does.
          */}
          <Button type="button" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === "danger" ? "destructive" : "accent"} disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </OverlayDialog>
  );
}
