"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--color-panel)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-line)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
