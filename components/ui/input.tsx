import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-md border border-line bg-panel px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-ink-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
