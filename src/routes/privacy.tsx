import { createFileRoute, Link } from "@tanstack/react-router";
import { jsonLdScript, pageJsonLd, seoLinks, seoMeta } from "@/lib/seo";
import { PARENT_NAME } from "@/lib/instrument";
import { panelClass } from "@/components/ui/panel";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { cn } from "@/lib/utils";

const TITLE = `Privacy · ${PARENT_NAME}`;
const DESCRIPTION = "What this site stores, where it stores it, and how to get rid of it.";

/*
 * Written from the schema, not from a template.
 *
 * Every row below was read out of migrations/0001_auth.sql through
 * 0005_feedback_attachment.sql and src/lib/storage-keys.ts. That is deliberate:
 * a privacy policy assembled from a generator says things that are not true of
 * the app it is attached to, and the failure is silent, because nobody reads it
 * until it matters.
 *
 * Two things to keep in step with the code if either changes:
 *
 *   - AI drafting. `src/lib/ai/draft.ts` can send a brief to Anthropic or
 *     OpenAI, but no component imports it and the Build page does not offer it,
 *     so nothing here reaches a model provider today. The moment that is wired
 *     up, this page needs a paragraph saying so, and it is exactly the kind of
 *     change that ships without anyone thinking about this file.
 *   - Analytics. There are none. No gtag, Plausible, PostHog, Sentry or
 *     equivalent appears anywhere in the source. Adding one changes this page.
 *
 * Retention is deliberately not stated: how long records are kept after an
 * account is deleted is a decision for whoever owns this, not a fact about the
 * code, and inventing a number here would be a promise nobody had made. It sat
 * on the page as "[still to be decided]" for an afternoon, which is worse than
 * silence — it points at the gap and still answers nothing.
 *
 * Contact is settled: requests go through /feedback, which works signed out.
 * The form asks for no email, so the page tells people to include one.
 */
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESCRIPTION, path: "/privacy" }),
    links: seoLinks("/privacy"),
    scripts: jsonLdScript(pageJsonLd("AboutPage", { title: TITLE, description: DESCRIPTION, path: "/privacy" })),
  }),
  component: PrivacyPage,
});

const onThisDevice = [
  ["Favourites, projects, saved checks and reviews", "Kept in this browser under the key desk-v1."],
  ["Build drafts", "Kept in this browser under the key workshop-v1."],
  ["Theme, and per-model unit choices", "Kept in this browser. Unit choices last for the session only."],
];

const onAnAccount = [
  ["Your email address and name", "Needed to sign you in and to tell your account apart from anyone else's."],
  ["A hashed password", "Stored as a hash. The password itself is never written down, here or anywhere."],
  ["Session records", "Each sign-in stores an expiry, and the IP address and browser user-agent that created it, so a session can be recognised and expired."],
  ["Favourites, projects, saved checks and reviews", "The same records as above, moved off the device so they follow the account."],
  ["Build drafts", "The document you authored, so a draft opens on another machine."],
];

const feedback = [
  ["What you wrote", "The message, and whether you sent it as a bug or a note."],
  ["The page you sent it from", "So a report about a model can be read against that model."],
  ["An image, if you attached one", "Stored alongside the message, in the same database and the same backup."],
  ["Your account id, if you were signed in", "So a reply is possible. Feedback can be sent signed out, and then it carries no account."],
];

function Table({ rows }: { rows: string[][] }) {
  return (
    <div className={cn(panelClass, "mt-4")}>
      {rows.map(([what, why]) => (
        <div key={what} className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-4">
          <strong className="text-sm">{what}</strong>
          <p className="text-sm leading-6 text-muted">{why}</p>
        </div>
      ))}
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="page-wrap max-w-3xl">
      <PageHeader
        kicker="Privacy"
        title="What this site keeps, and where."
        ledeClassName="max-w-none"
        lede={
          <>
            <p>
              Written from the database schema rather than a template, so it describes this site and not a
              generic one. If something here disagrees with what the app does, the page is the thing that is
              wrong — please{" "}
              <Link to="/feedback" className="link-accent">
                say so
              </Link>
              .
            </p>
            <p className="mt-3">
              The short version: there is no analytics, no advertising, no tracking, and nothing is sold or
              shared for marketing. You can use every model on this site without an account, and if you do,
              your work never leaves your browser.
            </p>
          </>
        }
      />

      <section className="mt-12">
        <SectionHeader
          kicker={<>Without an account</>}
          title={<>Your work stays in your browser.</>}
        />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Signed out, the site stores what you do in this browser's local storage and sends none of it
          anywhere. Clearing site data for this domain removes all of it, and nothing is left behind on the
          server, because nothing ever reached the server.
        </p>
        <Table rows={onThisDevice} />
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>With an account</>} title={<>What an account stores.</>} />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Signing in moves the same records onto the account so they follow you between machines. Signing in
          never merges an account that already holds work with what is on the device — the device copy stays
          where it is, and signing out shows it again.
        </p>
        <Table rows={onAnAccount} />
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Feedback</>} title={<>What a message carries.</>} />
        <Table rows={feedback} />
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Cookies</>} title={<>One cookie, and it is the session.</>} />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Signing in sets a single cookie holding your session token. It is a{" "}
          <code className="font-mono text-xs">__Host-</code> cookie, which means the browser sends it only to
          this exact origin, only over HTTPS. It is not readable by scripts, it is not used to profile you,
          and there are no others. Nothing on this site sets an advertising or analytics cookie, so there is
          no consent banner to dismiss.
        </p>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Other companies</>} title={<>Who else sees a request.</>} />
        <div className={cn(panelClass, "mt-4 p-5")}>
          <p className="text-sm leading-6 text-muted">
            <strong className="text-fg">Vercel</strong> hosts the site and runs the database, so it processes
            every request in the ordinary course of serving pages.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            <strong className="text-fg">Google Fonts</strong> serves the two typefaces. Your browser fetches
            them directly, which means Google sees the request and your IP address. Nothing else on this site
            is loaded from another company.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            No analytics service, error reporter, advertising network or session recorder is present. Nothing
            you type into a model is sent anywhere: every calculation runs in your browser.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Removing it</>} title={<>How to get rid of any of this.</>} />
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted">
          <li>
            <strong className="text-fg">Device data:</strong> clear site data for this domain in your browser,
            or delete individual items from{" "}
            <Link to="/workshop" className="link-accent">
              Project
            </Link>
            .
          </li>
          <li>
            <strong className="text-fg">Account data:</strong> delete individual favourites, projects, checks,
            reviews and drafts from Project and Build. To remove the account itself and everything attached to
            it, ask through Feedback.
          </li>
          <li>
            <strong className="text-fg">Feedback:</strong> ask through Feedback, quoting roughly when you
            sent it and what it said.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Contact</>} title={<>Asking about your data.</>} />
        <div className={cn(panelClass, "mt-4 p-5")}>
          <p className="text-sm leading-6 text-muted">
            Requests about access, correction or deletion go through{" "}
            <Link to="/feedback" className="link-accent">
              Feedback
            </Link>
            . It works signed out as well as signed in.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Send it signed in where you can — that identifies the account without you having to prove
            anything. Signed out, put an email address in the message, because the form does not ask for one
            and there is otherwise no way to reply to you.
          </p>
        </div>
      </section>
    </div>
  );
}
