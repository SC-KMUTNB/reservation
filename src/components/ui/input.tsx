import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
  {
    variants: {
      intent: {
        default:
          "border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
        error:
          "border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20",
      },
    },
    defaultVariants: {
      intent: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, intent, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ intent, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
