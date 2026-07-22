import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "steel" | "gold" | "gain" | "loss" | "warn";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-canvas text-ink-2",
        variant === "steel" && "bg-steel/10 text-steel",
        variant === "gold" && "bg-gold/10 text-gold",
        variant === "gain" && "bg-gain/10 text-gain",
        variant === "loss" && "bg-loss/10 text-loss",
        variant === "warn" && "bg-warn/10 text-warn",
        className
      )}
    >
      {children}
    </span>
  );
}
