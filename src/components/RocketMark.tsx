export function RocketMark({ size = 28 }: { size?: number }) {
  // Simplified mark: a rocket blasting through an open-bottom orange ring,
  // black smoke base, white cursor/arrow in the nose.
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* open-bottom ring */}
      <path
        d="M12 26a12 12 0 1 1 24 0"
        stroke="#e86a2a"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* rocket body */}
      <path
        d="M24 6c4.5 3 7 8 7 14 0 3.5-1 6.5-2.6 9H19.6C18 26.5 17 23.5 17 20c0-6 2.5-11 7-14Z"
        fill="#1b2228"
      />
      {/* nose cursor/arrow */}
      <path d="M24 12l3.2 6.4-3.2-1.6-3.2 1.6L24 12Z" fill="#ffffff" />
      {/* fins */}
      <path d="M19.6 24l-4 5 4-0.5v-4.5ZM28.4 24l4 5-4-0.5v-4.5Z" fill="#e86a2a" />
      {/* smoke base */}
      <path
        d="M20 33c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.5-1-2.7-2-3.5h-4c-1 0.8-2 2-2 3.5Z"
        fill="#1b2228"
        opacity="0.85"
      />
    </svg>
  );
}
