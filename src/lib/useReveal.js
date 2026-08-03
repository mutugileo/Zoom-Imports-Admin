import { useEffect, useRef, useState } from 'react';

/**
 * Scroll reveal for the admin portal.
 *
 * Deliberately faster and shorter than the storefront's version (260ms / 10px
 * against 620ms / 18px). This is a tool people use all day: motion here should
 * settle the eye on a new panel, not make anyone wait to read a number.
 *
 * Applied at card level only. Staggering table rows would mean staff watching
 * data arrive, which is the opposite of useful.
 */

const DURATION = 260;
const DISTANCE = 10;
const STAGGER = 55;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useReveal = (options = {}) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(true);
      return undefined;
    }
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) {
      setShown(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: options.threshold ?? 0.08, rootMargin: options.rootMargin ?? '0px 0px -4% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return [ref, shown];
};

export const revealStyle = (shown, index = 0) => ({
  opacity: shown ? 1 : 0,
  transform: shown ? 'none' : `translateY(${DISTANCE}px)`,
  transition: `opacity ${DURATION}ms ease-out ${index * STAGGER}ms, transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) ${index * STAGGER}ms`,
});
