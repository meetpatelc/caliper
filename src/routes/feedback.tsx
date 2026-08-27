import { createFileRoute } from "@tanstack/react-router";
import { ICON } from "@instrument/ui";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bug, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { FEEDBACK_MAX_CHARS, listFeedback, submitFeedback, type FeedbackRow } from "@/lib/feedback";
import { ATTACHMENT_MAX_BYTES, inspectAttachment } from "@/lib/attachment";
import { SignedIn } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { SelectableCard } from "@/components/ui/selection";
import { EmptyState, LoadingState } from "@/components/ui/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({   head: () => ({
    meta: [
      { title: "Feedback · Instrument" },
      { name: "description", content: "Send a bug report or a message to the product desk." },
      { property: "og:title", content: "Feedback · Instrument" },
      { property: "og:description", content: "Send a bug report or a message to the product desk." },
    ],
  }),
  component: FeedbackPage });

function FeedbackPage() {
  const [kind, setKind] = useState<"bug" | "message">("bug");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; data: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [inboxTick, setInboxTick] = useState(0);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      // A toast alone left the field unmarked and the focus on the button, so
      // nothing told a keyboard or screen-reader user WHERE the problem was.
      // `Field` already wires aria-invalid and aria-errormessage from `error`.
      setMessageError("Add a message before sending.");
      messageRef.current?.focus();
      return;
    }
    setMessageError(null);
    setPending(true);
    try {
      await submitFeedback({
        data: { kind, message, pagePath: window.location.pathname, ...(attachment ? { attachment } : {}) },
      });
      setMessage("");
      setAttachment(null);
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
        <Field htmlFor="feedback-message" label="Full message" required error={messageError ?? undefined}>
          <Textarea id="feedback-message" ref={messageRef} value={message} onChange={(event) => { setMessage(event.target.value); if (messageError) setMessageError(null); }} rows={12} maxLength={FEEDBACK_MAX_CHARS} placeholder="Paste steps, values, and URLs." />
          {message.length > FEEDBACK_MAX_CHARS * 0.8 ? (
            <p role="status" className="mt-2 font-mono text-xs text-muted">
              {(FEEDBACK_MAX_CHARS - message.length).toLocaleString("en-US")} characters left of{" "}
              {FEEDBACK_MAX_CHARS.toLocaleString("en-US")}.
            </p>
          ) : null}
        </Field>
        <Field
          htmlFor="feedback-attachment"
          label="Screenshot"
          hint="Optional. PNG, JPEG, GIF or WebP, up to 2 MB — a picture of the wrong thing beats describing where it was."
          error={attachmentError ?? undefined}
        >
          <input
            id="feedback-attachment"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-fg"
            onChange={async (event) => {
              setAttachmentError(null);
              const file = event.target.files?.[0];
              if (!file) {
                setAttachment(null);
                return;
              }
              if (file.size > ATTACHMENT_MAX_BYTES) {
                setAttachmentError("That image is over 2 MB.");
                setAttachment(null);
                event.target.value = "";
                return;
              }
              const buffer = new Uint8Array(await file.arrayBuffer());
              // Sniffed here too, so a wrong file is refused before the upload
              // rather than after it. The server checks again regardless.
              const check = inspectAttachment(buffer);
              if (!check.ok) {
                setAttachmentError(check.reason);
                setAttachment(null);
                event.target.value = "";
                return;
              }
              let binary = "";
              for (const byte of buffer) binary += String.fromCharCode(byte);
              setAttachment({ name: file.name.slice(0, 200), data: btoa(binary) });
            }}
          />
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
