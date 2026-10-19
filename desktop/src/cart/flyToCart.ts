const FLIGHT_MS = 780;
const FLIGHT_EASE = 'cubic-bezier(0.6, -0.15, 0.3, 1)';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function flyToCart(imageUrl: string | null, from: Element | null) {
  const target = document.querySelector('[data-cart-target]');
  if (!imageUrl || !from || !target || prefersReducedMotion()) {
    return;
  }
  const start = from.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const size = Math.min(start.width, start.height, 220);
  const flyer = document.createElement('img');
  flyer.src = imageUrl;
  flyer.alt = '';
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${start.left + start.width / 2 - size / 2}px`,
    top: `${start.top + start.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'contain',
    zIndex: '1000',
    pointerEvents: 'none',
  });
  document.body.appendChild(flyer);
  const dx = end.left + end.width / 2 - (start.left + start.width / 2);
  const dy = end.top + end.height / 2 - (start.top + start.height / 2);
  const animation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(0.55) rotate(-8deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08) rotate(12deg)`, opacity: 0.2 },
    ],
    { duration: FLIGHT_MS, easing: FLIGHT_EASE, fill: 'forwards' },
  );
  animation.onfinish = () => {
    flyer.remove();
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
      { duration: 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  };
}
