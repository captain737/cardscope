import { useEffect, useRef } from 'react';

// Ambient cursor effects layered over the native cursor: a soft gold glow that
// eases behind the pointer, and a ripple pulse on click. Desktop + fine-pointer
// only, disabled under prefers-reduced-motion. pointer-events-none so nothing
// is ever blocked. Rendered outside .app-zoom so coordinates map 1:1.
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    const glow = glowRef.current;
    if (!glow) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let gx = tx;
    let gy = ty;
    let raf = 0;

    const tick = () => {
      gx += (tx - gx) * 0.15;
      gy += (ty - gy) * 0.15;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      glow.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => { glow.style.opacity = '0'; };

    const onDown = (e: PointerEvent) => {
      const ripple = document.createElement('div');
      ripple.style.cssText =
        `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:40px;height:40px;` +
        `border:2px solid var(--cl-ink);border-radius:9999px;pointer-events:none;z-index:59;`;
      document.body.appendChild(ripple);
      ripple
        .animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.25)', opacity: 0.5 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
          ],
          { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        )
        .finished.then(() => ripple.remove()).catch(() => ripple.remove());
    };

    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[340px] w-[340px] rounded-full opacity-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(circle, color-mix(in oklch, var(--cl-gold) 9%, transparent), transparent 64%)',
      }}
    />
  );
}
