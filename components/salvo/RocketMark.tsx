import { cn } from "@/lib/utils";

/**
 * Simplified Salvo brand mark: a rocket blasting through an open-bottom
 * orange ring, with a smoke base and a white cursor/arrow nose accent.
 * Used in the app header; the same geometry, simplified further, is the
 * favicon cut.
 */
export function RocketMark({ className, dark = false }: { className?: string; dark?: boolean }) {
  const bodyColor = dark ? "#eceef1" : "#1b2228";
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-6 w-6", className)}
      role="img"
      aria-label="Salvo"
    >
      {/* open-bottom ring */}
      <path
        d="M24 6a17 17 0 0 1 17 17c0 3.6-1 7-2.8 9.9"
        fill="none"
        stroke="#e86a2a"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M24 6A17 17 0 0 0 7 23c0 3.6 1 7 2.8 9.9"
        fill="none"
        stroke="#e86a2a"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* smoke base */}
      <ellipse cx="18" cy="38" rx="3.4" ry="2" fill={bodyColor} opacity="0.35" />
      <ellipse cx="24.5" cy="41" rx="4.2" ry="2.4" fill={bodyColor} opacity="0.5" />
      <ellipse cx="31" cy="37.5" rx="3" ry="1.8" fill={bodyColor} opacity="0.3" />

      {/* rocket body */}
      <path
        d="M24 9c3.6 3.2 5.6 8.4 5.6 14.2 0 4-1 7.7-2.7 10.6l-2.9 3.4-2.9-3.4C19.4 30.9 18.4 27.2 18.4 23.2 18.4 17.4 20.4 12.2 24 9Z"
        fill={bodyColor}
      />
      {/* fins */}
      <path d="M18.4 26.5c-2.4.6-4.2 2.3-5 4.6 2.4-.2 4.4-1 5.9-2.4Z" fill={bodyColor} />
      <path d="M29.6 26.5c2.4.6 4.2 2.3 5 4.6-2.4-.2-4.4-1-5.9-2.4Z" fill={bodyColor} />

      {/* white cursor / arrow nose */}
      <path d="M24 12.5 26.2 20h-4.4L24 12.5Z" fill="#ffffff" />
    </svg>
  );
}
