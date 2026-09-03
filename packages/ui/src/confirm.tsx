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
  cancelWhileBusy = false,
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
  /** Let Cancel close the dialog while `busy`. The caller must then ignore any late result. */
  cancelWhileBusy?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <OverlayDialog open={open} onClose={onClose} title={title} titleMode="visible" restoreFocusTo={restoreFocusTo}>
      <div className="px-5 pb-5">
        {children ? <div className="mt-3 text-sm leading-6 text-muted">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          {/*
            Cancel is disabled while busy unless the caller opts out.

            For a delete that takes a moment, disabling it is right: the work is
            nearly done and closing the dialog mid-flight leaves the list showing
            a row that is already gone. For AI drafting it is a trap — 60 to 90
            seconds behind a button reading "Working…" with every control dead,
            and the longer it runs the more somebody wants out.

            So the caller says which it is, rather than one of them silently
            changing for the other. Opting in means accepting that Cancel closes
            the dialog without aborting the work, so a late result must be
            ignored deliberately — `draft-with-ai` tickets each attempt for
            exactly that.
          */}
          <Button type="button" onClick={onClose} disabled={busy && !cancelWhileBusy}>
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
