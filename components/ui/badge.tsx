import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-line bg-canvas text-ink-2",
        gold: "border-gold/30 bg-gold/10 text-gold",
        steel: "border-steel/30 bg-steel/10 text-steel",
        gain: "border-gain/30 bg-gain/10 text-gain",
        loss: "border-loss/30 bg-loss/10 text-loss",
        warn: "border-warn/30 bg-warn/10 text-warn",
        ink: "border-ink/20 bg-ink text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
