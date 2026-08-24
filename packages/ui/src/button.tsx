import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        accent: "bg-accent text-accent-fg hover:bg-mark",
        outline: "border border-border bg-transparent hover:bg-elevated",
        ghost: "text-muted hover:bg-elevated hover:text-fg",
        mark: "border border-mark text-mark hover:bg-elevated",
      },
      size: {
        md: "h-10 px-3",
        sm: "h-8 px-2 text-xs",
        icon: "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      {...(!asChild ? { type: type ?? "button" } : {})}
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  );
});
