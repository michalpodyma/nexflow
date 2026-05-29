"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /* Nexflow design-system variants — no shadows, depth via surface only */
        primary:
          "bg-accent text-ink-inverse rounded-sm hover:bg-accent-hover",
        secondary:
          "bg-surface-2 text-ink border border-hairline rounded-sm hover:bg-surface-3",
        ghost:
          "text-ink-muted hover:text-accent rounded-sm focus-visible:underline",
        /* shadcn compat — kept for internal dashboard components */
        default: "bg-primary text-primary-foreground rounded-md hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90",
        outline:
          "border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-w-[44px] px-5 text-body-sm",
        sm: "h-9 px-3 text-body-sm",
        lg: "h-12 px-8 text-body",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
