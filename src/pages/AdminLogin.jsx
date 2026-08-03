import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';
import { PIN_LENGTH } from '@shared/data/siteContent';
import { Delete, LogIn } from 'lucide-react';

/**
 * PIN sign-in.
 *
 * A keypad rather than a form because of where this runs: a counter terminal on
 * Mombasa Road, often on a touch screen, with staff swapping between them
 * through the day. Four taps and you are in; there is no username to type.
 *
 * The PIN identifies the person as well as authorising them, which is what makes
 * the activity log meaningful — "Faith deleted a listing", not "someone did".
 *
 * This is a UI gate, not a security control. The comparison happens in this
 * browser against records in localStorage, so it keeps the wrong screens out of
 * the way and nothing more. The on-screen notice saying as much was removed at
 * the owner's request; the caveat now lives in the README, and real access
 * control still needs a server.
 */
export const AdminLogin = () => {
  const { signIn, resetAdminUsers } = useAdmin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const padRef = useRef(null);

  const fail = useCallback((message) => {
    setAttempts((n) => n + 1);
    setError(message);
    setShake(true);
    setPin('');
    window.setTimeout(() => setShake(false), 420);
  }, []);

  const submit = useCallback((value) => {
    const user = signIn(value);
    if (!user) fail('That PIN was not recognised');
  }, [signIn, fail]);

  const press = useCallback((digit) => {
    setError('');
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + digit;
      // Submit on the last digit rather than making them reach for a button.
      if (next.length === PIN_LENGTH) window.setTimeout(() => submit(next), 90);
      return next;
    });
  }, [submit]);

  const backspace = useCallback(() => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }, []);

  /* A hardware keyboard has to work too — most of these terminals have one. */
  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
      else if (e.key === 'Escape') { setPin(''); setError(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, backspace]);

  useEffect(() => { padRef.current?.focus(); }, []);

  return (
    <div className="login-screen">
      <div className="login-card" ref={padRef} tabIndex={-1}>
        <div className="login-brand">
          <div className="login-wordmark">Zoom Imports</div>
          <div className="login-sub">Dealership portal</div>
        </div>

        <label className="login-label" id="pin-label">Enter your PIN</label>

        {/* The dots are decorative; the live region below is what a screen
            reader announces, so it says how many digits, never the digits. */}
        <div
          className={`pin-dots${shake ? ' pin-shake' : ''}`}
          aria-hidden="true"
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span key={i} className={`pin-dot${i < pin.length ? ' is-filled' : ''}`} />
          ))}
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {error || `${pin.length} of ${PIN_LENGTH} digits entered`}
        </span>

        <p className={`login-error${error ? ' is-shown' : ''}`} role="alert">
          {error || ' '}
        </p>

        <div className="pin-pad" role="group" aria-labelledby="pin-label">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" className="pin-key" onClick={() => press(d)}>{d}</button>
          ))}
          <span />
          <button type="button" className="pin-key" onClick={() => press('0')}>0</button>
          <button
            type="button"
            className="pin-key pin-key-alt"
            onClick={backspace}
            aria-label="Delete last digit"
            disabled={pin.length === 0}
          >
            <Delete size={18} />
          </button>
        </div>

        <button
          type="button"
          className="btn-primary login-submit"
          onClick={() => submit(pin)}
          disabled={pin.length < PIN_LENGTH}
        >
          <LogIn size={15} /> Sign in
        </button>

        {attempts >= 3 && (
          <button type="button" className="login-recover" onClick={resetAdminUsers}>
            Locked out? Restore the demo staff accounts
          </button>
        )}
      </div>
    </div>
  );
};
