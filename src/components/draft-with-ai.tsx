import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ICON } from "@instrument/ui";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm";
import { panelClass } from "@/components/ui/panel";
import { SignedIn } from "@/lib/auth/gates";
import { draftCalculatorFromBrief, draftingAvailable } from "@/lib/ai/draft";
import type { AssistedDraft } from "@/lib/ai/draft-contract";
import { cn } from "@/lib/utils";

const MAX_BRIEF = 4000;

/**
 * Describe a calculator; get a draft to check.
 *
 * The control is absent unless the deployment has drafting configured, and
 * behind sign-in because each run spends the deployer's money.
 *
 * The draft never publishes itself and never lands in the library. It opens in
 * the Studio editor, labelled, with the numbers it produced from its own
 * example values shown before you accept it — so the first thing you see is
 * whether it computed something sensible, not a wall of prose asserting that it
 * did.
 */
export function DraftWithAI({ onAccept }: { onAccept: (draft: AssistedDraft) => void }) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ draft: AssistedDraft; preview: { label: string; display: string; unit: string }[] } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    draftingAvailable()
      .then((state) => {
        if (live) setAvailable(state.enabled);
      })
      .catch(() => {
        /* absent is the safe default */
      });
    return () => {
      live = false;
    };
  }, []);

  /*
   * Which attempt is current.
   *
   * Cancel now works while a draft is running, so a request can outlive the
   * dialog that asked for it. Without this, closing mid-draft and reopening
   * would show the abandoned answer arriving as though it were the new one —
   * and a failure toast would appear over a dialog nobody has open. Bumped on
   * every start and on every close; a response whose ticket is stale is dropped
   * on the floor, which is what cancelling means here.
   *
   * Declared above the `available` early return: a hook after a conditional
   * return runs on some renders and not others, which is the one thing the
   * rules of hooks exist to stop.
   */
  const attempt = useRef(0);

  if (!available) return null;

  const submit = async () => {
    if (brief.trim().length < 20) {
      toast.error("Describe the calculation in a sentence or two first.");
      return;
    }
    const ticket = ++attempt.current;
    setPending(true);
    setResult(null);
    try {
      const outcome = await draftCalculatorFromBrief({ data: { brief: brief.trim() } });
      if (ticket !== attempt.current) return;
      if (!outcome.ok) {
        toast.error(outcome.reason);
        return;
      }
      setResult({ draft: outcome.draft, preview: outcome.preview });
    } catch {
      if (ticket !== attempt.current) return;
      toast.error("Could not reach the drafting service.");
    } finally {
      if (ticket === attempt.current) setPending(false);
    }
  };

  return (
    <SignedIn>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className="h-auto min-h-28 flex-col items-start justify-between px-5 py-4 text-left"
        onClick={() => setOpen(true)}
      >
        <Sparkles size={ICON.lead} />
        <span>
          <span className="block text-base font-medium">Draft from a description</span>
          <span className="mt-1 block text-sm text-muted">
            Describe the calculation. You check it before it is anything.
          </span>
        </span>
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => {
          // Abandons any draft still in flight: see the note on `attempt`.
          attempt.current += 1;
          setPending(false);
          setOpen(false);
          setResult(null);
        }}
        title="Draft from a description"
        confirmLabel={result ? "Open in Build" : pending ? "Drafting…" : "Draft it"}
        cancelLabel="Cancel"
        tone="accent"
        busy={pending}
        restoreFocusTo={triggerRef}
        onConfirm={() => {
          if (!result) {
            void submit();
            return;
          }
          onAccept(result.draft);
          setOpen(false);
          setResult(null);
          setBrief("");
        }}
      >
        {result ? (
          <div className="grid gap-3">
            <p className="text-sm leading-6">
              <span className="font-medium">{result.draft.title}</span> — {result.draft.description}
            </p>
            <div className={cn(panelClass, "p-3")}>
              <p className="eyebrow">With its own example values</p>
              <ul className="mt-2 grid gap-1 text-sm">
                {result.preview.map((item) => (
                  <li key={item.label} className="flex justify-between gap-4">
                    <span className="text-muted">{item.label}</span>
                    <span className="font-mono tabular-nums">
                      {item.display} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* The whole point. A drafted model has not been checked by anyone,
                and must never be mistaken for one that has. */}
            <p className="border-l-2 border-danger pl-3 text-sm leading-6 text-muted">
              <span className="font-medium text-fg">Nobody has checked this.</span> It computed, which is not the same
              as being right. Read the relation and the boundary before you use the number, and it stays a draft until
              you publish it yourself.
            </p>
          </div>
        ) : (
          <Field
            htmlFor="ai-brief"
            label="What should it work out?"
            // The second sentence is the disclosure, and it lives in the hint so
            // it is part of the field's accessible description rather than a
            // footnote a screen reader skips. This is the only place on the
            // site where text a person types leaves the browser, and until now
            // nothing on the page said so; the Privacy page said the opposite.
            hint="Name the quantity, the inputs you have, and the conditions it has to hold under. What you write here is sent to a model provider (Anthropic or OpenAI) to produce the draft — it is the only text on this site that leaves your browser."
          >
            <Textarea
              id="ai-brief"
              rows={6}
              value={brief}
              maxLength={MAX_BRIEF}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Hoop stress in a thin-walled cylinder from internal pressure, inside diameter and wall thickness. Only valid while the wall stays thin."
            />
          </Field>
        )}
      </ConfirmDialog>
    </SignedIn>
  );
}
