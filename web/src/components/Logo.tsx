// Brushed-graphite card stack with a checkmark cutting across it — the
// wordmark icon. A recreation (not a raster import) so it stays crisp at any
// size; the gradient is a neutral dark-gray metal to match the monochrome ink.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="cardfit-logo-gold" x1="4" y1="2" x2="34" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="0.5" stopColor="#2a2a2a" />
          <stop offset="1" stopColor="#141414" />
        </linearGradient>
      </defs>
      <rect x="13" y="3" width="19" height="13" rx="3" transform="rotate(-6 13 3)" fill="url(#cardfit-logo-gold)" opacity="0.9" />
      <rect x="4" y="12" width="20" height="15" rx="3" fill="url(#cardfit-logo-gold)" />
      <path d="M6 21 L13 29 L32 5" stroke="url(#cardfit-logo-gold)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
