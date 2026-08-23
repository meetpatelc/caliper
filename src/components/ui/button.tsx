/* eslint-disable react-refresh/only-export-components -- kit variants re-export */
import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { buttonVariants } from "@instrument/ui";
import { cn } from "@/lib/utils";

export { buttonVariants };


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
