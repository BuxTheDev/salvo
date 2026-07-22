/** Simplified Salvo rocket mark used in the header (spec §10). */
export function RocketMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: "block", flex: "0 0 auto" }} aria-label="Salvo logo">
      <path d="M37.1 90.8 A40 40 0 1 1 82.9 90.8" fill="none" stroke="#e86a2a" strokeWidth="10" strokeLinecap="round" />
      <g transform="rotate(18 60 60)">
        <polygon points="55,74 65,74 70,101 50,101" fill="#8fa0b0" />
        <path d="M60 22 C 69 22 69 46 66 62 C 64 72 62 78 60 78 C 58 78 56 72 54 62 C 51 46 51 22 60 22 Z" fill="#eceae4" />
        <polygon points="54,60 47,79 54,73" fill="#eceae4" />
        <polygon points="66,60 73,79 66,73" fill="#eceae4" />
        <polygon points="60,32 66,45 60,41 54,45" fill="#e86a2a" />
      </g>
    </svg>
  );
}
