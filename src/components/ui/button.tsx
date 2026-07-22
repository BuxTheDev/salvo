import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "gold" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-12 px-6 text-base",
          variant === "default" && "bg-ink text-white hover:bg-ink/90",
          variant === "gold" && "bg-gold text-white hover:bg-gold/90",
          variant === "outline" && "border border-line bg-panel hover:bg-canvas",
          variant === "ghost" && "hover:bg-canvas",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
