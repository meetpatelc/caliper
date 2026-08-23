import { useLayoutEffect, useRef, useState } from "react";
import { inlineRelations, splitRelations } from "@/lib/formula-display";
import { cn } from "@/lib/utils";

/** Semicolon on one line when it fits. Stack when that line would clip. */
export function GoverningRelation({ formula, className }: { formula: string; className?: string }) {
  const parts = splitRelations(formula);
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [stack, setStack] = useState(false);
  const inline = inlineRelations(formula);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!box || !measure || parts.length < 2) {
      setStack(false);
      return;
    }
    const check = () => setStack(measure.scrollWidth > box.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(box);
    return () => observer.disconnect();
  }, [inline, parts.length]);

  return (
    <div ref={boxRef} className={cn("relative overflow-hidden font-mono text-accent", className)}>
      <span
        ref={measureRef}
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
        aria-hidden="true"
      >
        {inline}
      </span>
      {stack
        ? parts.map((part) => (
            <span key={part} className="block">
              {part}
            </span>
          ))
        : inline}
    </div>
  );
}
