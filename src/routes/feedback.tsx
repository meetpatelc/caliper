import { createFileRoute } from "@tanstack/react-router";
import { ICON } from "@instrument/ui";
import { FormEvent, useEffect, useState } from "react";
import { Bug, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { listFeedback, submitFeedback, type FeedbackRow } from "@/lib/feedback";
import { SignedIn } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { PageHeader, SectionHeader } from "@/components/ui/page";
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
      <form className="mt-8 grid gap-6" onSubmit={onSubmit}>
        <fieldset>
          <legend className="text-sm">Message type</legend>
          <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
            <SelectableCard asChild selected={kind === "bug"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" className="sr-only" checked={kind === "bug"} onChange={() => setKind("bug")} />
              <Bug size={ICON.lead} className="text-accent" />
              <span>
                <strong className="block">Report a bug</strong>
                <small className="text-muted">What happened, where, and what you expected.</small>
              </span>
              </label>
            </SelectableCard>
            <SelectableCard asChild selected={kind === "message"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" className="sr-only" checked={kind === "message"} onChange={() => setKind("message")} />
              <MessageSquareText size={ICON.lead} className="text-accent" />
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
        <Button type="submit" variant="accent" disabled={pending} className="justify-self-start">
          <Send size={ICON.base} />
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
  // The inbox is admin-only server-side. A non-admin's call is rejected, and
  // there is nothing for them to see here — so render nothing at all rather
  // than an empty state that reads as "no messages yet".
  const [permitted, setPermitted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    listFeedback()
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setPermitted(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPermitted(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (!permitted) return null;

  return (
    <section className="mt-12">
      <SectionHeader
        kicker={<>Received</>}
        title={<>On this desk.</>}
      />
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
