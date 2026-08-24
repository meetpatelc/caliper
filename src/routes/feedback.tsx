import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { Bug, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { listFeedback, submitFeedback, type FeedbackRow } from "@/lib/feedback";
import { SignedIn } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { SelectableCard } from "@/components/ui/selection";
import { EmptyState, LoadingState } from "@/components/ui/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({ component: FeedbackPage });

function FeedbackPage() {
  const [kind, setKind] = useState<"bug" | "message">("bug");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [inboxTick, setInboxTick] = useState(0);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      toast.error("Add a message first.");
      return;
    }
    setPending(true);
    try {
      await submitFeedback({ data: { kind, message, pagePath: window.location.pathname } });
      setMessage("");
      setInboxTick((value) => value + 1);
      toast.success("Feedback sent. Thank you.");
    } catch {
      toast.error("Could not submit. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="page-wrap max-w-3xl">
      <PageHeader
        kicker="Product desk"
        title="Send a bug report or a message."
        ledeClassName="max-w-none"
        lede="Paste the full context. No account required. It reaches the product desk, not only this browser."
      />
      <form className="mt-8" onSubmit={onSubmit}>
        <fieldset>
          <legend className="eyebrow">Message type</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SelectableCard asChild selected={kind === "bug"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" className="sr-only" checked={kind === "bug"} onChange={() => setKind("bug")} />
              <Bug size={18} className="text-accent" />
              <span>
                <strong className="block">Report a bug</strong>
                <small className="text-muted">What happened, where, and what you expected.</small>
              </span>
              </label>
            </SelectableCard>
            <SelectableCard asChild selected={kind === "message"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" className="sr-only" checked={kind === "message"} onChange={() => setKind("message")} />
              <MessageSquareText size={18} className="text-accent" />
              <span>
                <strong className="block">Send a message</strong>
                <small className="text-muted">Request, idea, or other context.</small>
              </span>
              </label>
            </SelectableCard>
          </div>
        </fieldset>
        <Field htmlFor="feedback-message" label="Full message">
          <Textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={12} placeholder="Paste steps, values, and URLs." />
        </Field>
        <Button type="submit" variant="accent" disabled={pending} className="mt-4">
          <Send size={16} />
          {pending ? "Submitting" : "Submit"}
        </Button>
      </form>
      <SignedIn>
        <FeedbackInbox tick={inboxTick} />
      </SignedIn>
    </div>
  );
}

function FeedbackInbox({ tick }: { tick: number }) {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    listFeedback()
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return (
    <section className="mt-12">
      <p className="eyebrow">Received</p>
      <h2 className="section-title mt-1">On this desk.</h2>
      {rows === null ? (
        <LoadingState className="mt-4">Loading messages.</LoadingState>
      ) : rows.length === 0 ? (
        <EmptyState className="mt-4">Nothing received yet.</EmptyState>
      ) : (
        <ul className="mt-4 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className={cn(panelClass, "p-4")}>
              <p className="eyebrow">
                {row.kind === "bug" ? "Bug" : "Message"} · {row.createdAt.slice(0, 16).replace("T", " ")} UTC
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{row.message}</p>
              {row.pagePath ? <p className="meta mt-2">{row.pagePath}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
