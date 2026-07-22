export function RocketMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* orange ring — open bottom */}
      <path
        d="M24 6c7.732 0 14 6.268 14 14 0 4.8-2.4 9.05-6.1 11.55"
        stroke="#e86a2a"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M16.1 31.55C12.4 29.05 10 24.8 10 20c0-7.732 6.268-14 14-14"
        stroke="#e86a2a"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* rocket body */}
      <path
        d="M24 12c2.2 3.2 3.5 7.2 3.5 11.2 0 2.4-.4 4.6-1.1 6.6h-4.8c-.7-2-1.1-4.2-1.1-6.6 0-4 1.3-8 3.5-11.2z"
        fill="#1b2228"
      />
      {/* nose cursor/arrow */}
      <path d="M24 8.5 L27.2 14.2 H20.8 Z" fill="#fff" />
      {/* fins */}
      <path d="M19.5 27.5 L15 33.5 L20.2 30.2 Z" fill="#1b2228" />
      <path d="M28.5 27.5 L33 33.5 L27.8 30.2 Z" fill="#1b2228" />
      {/* smoke */}
      <path
        d="M20 34.5c1.2 1.8 2.5 2.8 4 2.8s2.8-1 4-2.8"
        stroke="#1b2228"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M18.5 37.5c1.6 1.6 3.4 2.4 5.5 2.4s3.9-.8 5.5-2.4"
        stroke="#1b2228"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
