import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-sm border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink file:border-0 file:bg-transparent file:text-body-sm file:font-medium placeholder:text-ink-subtle focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
