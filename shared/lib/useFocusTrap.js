import { useEffect, useRef } from 'react';

/**
 * NOTE ON PLACEMENT: this is the only file in `shared/` that imports React.
 * `shared/` has no node_modules of its own, so it resolves through whichever app
 * is importing it. Vite does that correctly for both; a tool that resolves from
 * `shared/` directly needs `--alias:react=<app>/node_modules/react`. It lives
 * here rather than being copied into each app because a focus trap that drifts
 * between two copies is a focus trap that is broken in one of them.
 *
 * Keeps keyboard focus inside an open dialog, and puts it back when the dialog
 * closes.
 *
 * Three separate failures without this, all of them invisible to a mouse user:
 *
 * 1. Opening a modal leaves focus on the page behind it, so the first Tab lands
 *    somewhere under the overlay that the visitor cannot see.
 * 2. Tabbing past the last control escapes into the page behind, where a screen
 *    reader then reads content the overlay is covering.
 * 3. Closing returns focus to the top of the document, so a keyboard user has to
 *    tab back through the entire header to get where they were.
 *
 * The focusable set is re-queried on every Tab rather than cached: these dialogs
 * swap their contents (the cart empties, the review form becomes a thank-you),
 * and a cached list would point at removed nodes.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const useFocusTrap = (active) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    // Where focus was before the dialog opened, so it can be handed back.
    const previous = document.activeElement;

    const focusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null
      );

    // Move focus in. The container itself is the fallback when a dialog opens
    // with nothing focusable in it yet.
    const first = focusables()[0];
    (first ?? node).focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];

      // Focus may sit on the container itself; treat that as "before the first".
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === node)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      // Guard: the trigger can be unmounted by the time we close (deleting a
      // row from its own confirm dialog), and focus() would throw.
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [active]);

  return ref;
};
