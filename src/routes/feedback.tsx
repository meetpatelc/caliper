import { createFileRoute } from "@tanstack/react-router";
import { seoLinks, seoMeta } from "@/lib/seo";
import { ICON } from "@instrument/ui";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bug, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { FEEDBACK_CONTACT_MAX_CHARS, FEEDBACK_MAX_CHARS, listFeedback, looksLikeEmail, submitFeedback, type FeedbackRow } from "@/lib/feedback";
import { ATTACHMENT_MAX_BYTES, inspectAttachment } from "@/lib/attachment";
import { SignedIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { SelectableCard } from "@/components/ui/selection";
import { EmptyState, LoadingState } from "@/components/ui/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({   head: () => ({
    meta: seoMeta({ title: "Feedback · Instrument", description: "Send a bug report or a message to the product desk.", path: "/feedback" }),
    links: seoLinks("/feedback"),
  }),
  component: FeedbackPage });

function FeedbackPage() {
  const [kind, setKind] = useState<"bug" | "message">("bug");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const { user } = useCurrentUserState();

  /*
   * Signed in, the account already knows the address, so fill it and let them
   * change it. Required either way: the stored row is what gets answered, and
   * looking a sender up by account id later is a step nobody takes.
   */
  useEffect(() => {
    const known = user?.primaryEmail;
    // `current ||` so it never overwrites something already typed — the session
    // resolves after first paint, and clobbering a half-typed address then
    // would be the worst possible moment.
    if (known) setContact((current) => current || known);
  }, [user?.primaryEmail]);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; data: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [inboxTick, setInboxTick] = useState(0);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const address = contact.trim();
    // Before the message check: it is the first field, so a submit with both
    // empty should point at the first thing to fix, not the second.
    if (!looksLikeEmail(address)) {
      setContactError(address ? "That does not look like an email address." : "Add an email address so a reply is possible.");
      contactRef.current?.focus();
      return;
    }
    setContactError(null);
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
        data: { kind, contact: address, message, pagePath: window.location.pathname, ...(attachment ? { attachment } : {}) },
      });
      setMessage("");
      setAttachment(null);
      // The address stays: sending twice from one visit is common, and a signed
      // -in person would only watch it refill itself anyway.
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
      {/*
        `noValidate` because this form presents its own errors.

        `type="email"` is worth keeping — it is the right keyboard on a phone
        and the right autofill everywhere — but it also switches on the
        browser's constraint validation, which fires first and cancels the
        submit event entirely. The visible result was a native bubble in the
        browser's own styling, the field focused, and the app's error never set:
        `Field` renders nothing, `aria-errormessage` points at nothing, and a
        screen reader is told only "invalid". Turning native validation off
        makes the handler authoritative, which is what the rest of the form
        already assumes — that is why `Field` sets `aria-required` rather than
        the `required` attribute.
      */}
      <form className="mt-8 grid gap-6" onSubmit={onSubmit} noValidate>
        <fieldset>
          <legend className="text-sm">Message type</legend>
          <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
            <SelectableCard asChild selected={kind === "bug"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" value="bug" className="sr-only" checked={kind === "bug"} onChange={() => setKind("bug")} />
              <Bug size={ICON.lead} className="text-accent" />
              <span>
                <strong className="block">Report a bug</strong>
                <small className="text-muted">What happened, where, and what you expected.</small>
              </span>
              </label>
            </SelectableCard>
            <SelectableCard asChild selected={kind === "message"} className="flex cursor-pointer gap-3 p-4">
              <label>
              <input type="radio" name="kind" value="message" className="sr-only" checked={kind === "message"} onChange={() => setKind("message")} />
              <MessageSquareText size={ICON.lead} className="text-accent" />
              <span>
                <strong className="block">Send a message</strong>
                <small className="text-muted">Request, idea, or other context.</small>
              </span>
              </label>
            </SelectableCard>
          </div>
        </fieldset>
        <Field
          htmlFor="feedback-contact"
          label="Your email"
          required
          error={contactError ?? undefined}
          hint="So a reply is possible. Used to answer this message and nothing else — no list, no marketing."
        >
          <Input
            id="feedback-contact"
            ref={contactRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={FEEDBACK_CONTACT_MAX_CHARS}
            value={contact}
            onChange={(event) => {
              setContact(event.target.value);
              if (contactError) setContactError(null);
            }}
            placeholder="you@example.com"
          />
        </Field>
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
              {/*
                A mailto, because the whole point of collecting this is that
                answering should be one click rather than a copy and a paste
                into another application. Rows written before the field existed
                have none, and say so rather than rendering an empty line —
                "we never asked" reads very differently from "they declined".
              */}
              <p className="meta mt-1">
                {row.contact ? (
                  <a href={`mailto:${row.contact}`} className="link-accent">
                    {row.contact}
                  </a>
                ) : (
                  <span className="text-muted">No reply address — sent before the field existed.</span>
                )}
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
