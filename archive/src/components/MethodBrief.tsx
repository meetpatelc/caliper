import { BookOpenText, CircleAlert, ClipboardList, Compass, Sigma } from "lucide-react";
import type { ToolDefinition } from "@/lib/catalog";
import type { ToolBrief } from "@/lib/toolBriefs";
import { buttonVariants } from "@/components/ui/button";

export default function MethodBrief({ tool, brief, activeMethod }: { tool: ToolDefinition; brief: ToolBrief; activeMethod: string }) {
  return (
    <section id="theory" className="mt-8 border-t border-border pt-6" aria-labelledby="method-brief-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Method brief</p>
          <h2 id="method-brief-title" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
            Read the model before the number.
          </h2>
        </div>
        <a href={tool.sourceUrl} target="_blank" rel="noreferrer" className={buttonVariants()}>
          <BookOpenText size={14} />
          {tool.sourceLabel}
        </a>
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
        <article className="bg-surface p-4">
          <Compass size={16} className="text-accent" />
          <p className="eyebrow mt-3">Purpose</p>
          <p className="mt-2 text-sm leading-6 text-muted">{brief.purpose}</p>
        </article>
        <article className="bg-surface p-4">
          <Sigma size={16} className="text-accent" />
          <p className="eyebrow mt-3">Governing relation</p>
          <code className="mt-2 block font-mono text-[12px] leading-5 text-fg">{activeMethod}</code>
        </article>
        <article className="bg-surface p-4">
          <ClipboardList size={16} className="text-accent" />
          <p className="eyebrow mt-3">Establish first</p>
          <p className="mt-2 text-sm leading-6 text-muted">{brief.inputContext}</p>
        </article>
        <article className="bg-surface p-4">
          <CircleAlert size={16} className="text-mark" />
          <p className="eyebrow mt-3">Boundary</p>
          <p className="mt-2 text-sm leading-6 text-muted">{brief.boundary}</p>
        </article>
        <article className="bg-surface p-4 md:col-span-2">
          <p className="eyebrow">How to read the result</p>
          <p className="mt-2 text-sm leading-6 text-muted">{brief.interpretation}</p>
          <p className="mt-3 font-mono text-[11px] text-muted">
            v{tool.contract.formulaVersion} · {tool.contract.validation} · {tool.contract.safetyTier} · {brief.sourceScope}
          </p>
        </article>
      </div>
    </section>
  );
}
