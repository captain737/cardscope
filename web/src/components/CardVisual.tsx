import { useState } from 'react';
import { CreditCard as CreditCardType } from '../types';
import { Wifi } from 'lucide-react';

interface CardVisualProps {
  card: CreditCardType;
}

// Assets that aren't a flat card face. We rotate art 90° to stand it up in
// the portrait slot, which turns banners, logos, and angled 3D photos into
// sideways garbage — so if the URL smells like one of those, skip it and
// render the gradient face instead. Mirrors the crawler's blocklist
// (credit-card-crawler/src/fetch.py) as a client-side safety net.
const BAD_ART = /(banner|array|logo|hero|device|sphere|apple|google-?pay|paypal|wallet|icon|angled?|photo-|-photo|lifestyle|background)/i;

function isLikelyCardArt(url?: string): boolean {
  return Boolean(url) && !BAD_ART.test(url!);
}

export default function CardVisual({ card }: CardVisualProps) {
  const [artFailed, setArtFailed] = useState(false);
  const showArt = isLikelyCardArt(card.imageUrl) && !artFailed;

  // Real card art, rotated to stand vertically in the same portrait slot
  // the stylized face occupies. Issuer art is landscape; rotating 90°
  // fills the slot without distortion (art keeps its own aspect ratio).
  if (showArt) {
    return (
      <div className="relative w-[240px] h-[360px] md:w-[280px] md:h-[420px] flex items-center justify-center">
        <img
          src={card.imageUrl}
          alt={`${card.name} card art`}
          loading="lazy"
          onError={() => setArtFailed(true)}
          className="rotate-90 w-[360px] h-[240px] md:w-[420px] md:h-[280px] max-w-none object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        />
      </div>
    );
  }

  // Fallback: the stylized gradient face, for cards the crawler hasn't
  // found art for (and all mock data).
  return (
    <div className={`relative w-[240px] h-[360px] md:w-[280px] md:h-[420px] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col justify-between ${card.gradient}`}>
      {/* Texture / Noise overlay */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      {/* Subtle radial glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/40 blur-3xl rounded-full" />

      {/* Top row: Issuer and Contactless icon */}
      <div className="relative flex justify-between items-start z-10">
        <span className="font-display font-bold tracking-widest text-ink/90 text-sm md:text-base uppercase">{card.issuer}</span>
        <Wifi className="w-6 h-6 text-ink/70 rotate-90" />
      </div>

      {/* Middle row: Chip */}
      <div className="relative z-10 mt-12 md:mt-16">
        <div className="w-10 h-12 md:w-12 md:h-14 bg-gradient-to-br from-primary/50 to-primary-deep/30 rounded-md border border-primary/40 backdrop-blur-sm shadow-inner flex flex-col justify-around p-1">
          <div className="w-full h-[1px] bg-primary/40"></div>
          <div className="w-full h-[1px] bg-primary/40"></div>
          <div className="w-full h-[1px] bg-primary/40"></div>
        </div>
      </div>

      {/* Bottom row: Name and numbers */}
      <div className="relative z-10 mt-auto">
        <div className="text-ink/60 font-mono tracking-[0.3em] mb-2 md:mb-4 text-xs md:text-sm">
          •••• •••• •••• {card.last4}
        </div>
        <div className="text-ink font-display font-semibold text-xl md:text-2xl leading-none drop-shadow-sm">
          {card.name}
        </div>
      </div>
    </div>
  );
}
