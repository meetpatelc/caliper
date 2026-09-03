import { createFileRoute, Link } from "@tanstack/react-router";
import { jsonLdScript, pageJsonLd, seoLinks, seoMeta } from "@/lib/seo";
import { PARENT_NAME } from "@/lib/instrument";
import { panelClass } from "@/components/ui/panel";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { cn } from "@/lib/utils";

const TITLE = `Terms · ${PARENT_NAME}`;
const DESCRIPTION = "The terms of use, and the limit of what a number from this site means.";

/*
 * Four things are deliberately not stated here, and this is the record of that.
 *
 * The operating entity, the governing law and venue, a limitation of liability,
 * and a data-retention period. Each is a decision for whoever owns this, not a
 * fact that can be read out of the code, and none is invented here — a made-up
 * liability clause reads exactly like a real one and protects nobody.
 *
 * They were briefly on the page as "[still to be decided]". That is worse than
 * silence: it draws a reader's eye to the gap and still says nothing. Not
 * naming a jurisdiction is ordinary; announcing that you have not picked one is
 * not. So the open items live here, where the next person to work on this file
 * will see them, rather than in front of everybody who reads the page.
 *
 * Contact is settled and is not among them: notices go through /feedback, which
 * works signed out.
 *
 * The disclaimer here has to agree with the one the app already makes.
 *
 * Every result carries "A first-pass number, not a code check, certification,
 * or approval", /about lists what the product is and is not suitable for, and
 * eight models are marked safetyTier C because a wrong answer has physical
 * consequences. A terms page that hedged differently — or worse, more weakly —
 * would be the app contradicting itself in the one place that is meant to
 * settle the question.
 *
 * The bracketed items are decisions rather than facts, and belong to the owner.
 */
export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESCRIPTION, path: "/terms" }),
    links: seoLinks("/terms"),
    scripts: jsonLdScript(pageJsonLd("AboutPage", { title: TITLE, description: DESCRIPTION, path: "/terms" })),
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="page-wrap max-w-3xl">
      <PageHeader
        kicker="Terms of use"
        title="What a number here is, and is not."
        ledeClassName="max-w-none"
        lede={
          <p>
            These terms say the same thing the app says beside every result, in one place. If they appear to
            say something weaker, the app is right and this page is wrong.
          </p>
        }
      />

      <section className="mt-12">
        <SectionHeader kicker={<>The result</>} title={<>A first-pass number, not an approval.</>} />
        <div className={cn(panelClass, "mt-4 p-5")}>
          <p className="text-sm leading-6 text-muted">
            Every model on this site shows its method, its assumptions, its source and the boundary where it
            stops being valid. A result is a starting point for work you verify yourself. It is not a code
            check, a certification, a sealed calculation, a compliance decision, or engineering advice, and
            nothing here creates a professional relationship of any kind.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Using a model outside the geometry, loading, material and boundary assumptions shown on its page
            puts you outside what the model can answer, whatever number it returns.{" "}
            <Link to="/about" className="link-accent">
              About &amp; limits
            </Link>{" "}
            sets out what this is suitable for and what it is not, and{" "}
            <Link to="/reference" className="link-accent">
              the method library
            </Link>{" "}
            names the source and version behind each one.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Responsibility</>} title={<>The check is yours.</>} />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          You are responsible for deciding whether a model applies to your problem, for the values you put
          into it, and for verifying anything you rely on against applicable codes, specifications,
          manufacturer data and qualified judgment. The site is provided as it is, without warranty, and
          without a promise that any model is correct, current, or fit for a particular purpose.
        </p>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>What you author</>} title={<>Your drafts stay yours.</>} />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Models you write in Build, and the checks and reviews you save, remain yours. Nothing you author is
          published, shared or used to train anything. Signed out it never leaves your browser; signed in it
          is stored against your account so it follows you between machines, and{" "}
          <Link to="/privacy" className="link-accent">
            Privacy
          </Link>{" "}
          sets out exactly what that means.
        </p>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Fair use</>} title={<>What not to do with it.</>} />
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted">
          <li>Do not present a result from this site as a certified, sealed or approved calculation.</li>
          <li>Do not attempt to disrupt the service, or to reach accounts or data that are not yours.</li>
          <li>Do not submit content through feedback that you have no right to send.</li>
        </ul>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Availability</>} title={<>No promise of uptime.</>} />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Models may be corrected, changed or withdrawn, and a correction can change a number that a link you
          already sent will now recompute. That is why a shared record carries the formula version it was made
          under. The service may be unavailable at any time, and accounts may be suspended where these terms
          are broken.
        </p>
      </section>

      <section className="mt-12">
        <SectionHeader kicker={<>Contact</>} title={<>Reaching whoever runs this.</>} />
        <div className={cn(panelClass, "mt-4 p-5")}>
          <p className="text-sm leading-6 text-muted">
            Notices and questions go through{" "}
            <Link to="/feedback" className="link-accent">
              Feedback
            </Link>
            , which works signed out. Include an email address in the message if you want a reply.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            The source for this site is published under the licence in its repository. That licence governs
            the code; this page governs use of the hosted service.
          </p>
        </div>
      </section>
    </div>
  );
}
