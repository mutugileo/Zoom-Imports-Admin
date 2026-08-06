import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';
import { Delete, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';

const PIN_LENGTH = 4;

const BACKGROUND_SLIDES = [
  {
    id: 'cx5',
    title: 'Mazda CX-5 Signature',
    desktopImage: '/media/login-cx5-1920.webp',
    mobileImage: '/media/login-cx5-1200.webp',
    alt: 'Mazda CX-5 Signature at Zoom Imports'
  },
  {
    id: 'showroom',
    title: 'Zoom Imports Dealership',
    desktopImage: '/media/login-zoom-showroom.jpg',
    mobileImage: '/media/login-zoom-showroom.jpg',
    alt: 'Zoom Imports Flagship Showroom'
  }
];

const BackgroundSwiper = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % BACKGROUND_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + BACKGROUND_SLIDES.length) % BACKGROUND_SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 40) nextSlide();
    if (distance < -40) prevSlide();
  };

  return (
    <div
      className="login-swiper"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {BACKGROUND_SLIDES.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.id}
            className={`login-swiper-slide ${isActive ? 'is-active' : ''}`}
            aria-hidden={!isActive}
          >
            <picture>
              {slide.mobileImage && <source media="(max-width: 700px)" srcSet={slide.mobileImage} />}
              <img src={slide.desktopImage} alt={slide.alt} className="login-swiper-img" />
            </picture>
            <div className="login-swiper-overlay" />
          </div>
        );
      })}

      <div className="login-swiper-controls" role="region" aria-label="Background image slider controls">
        <button
          type="button"
          className="login-swiper-btn"
          onClick={prevSlide}
          aria-label="Previous background image"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="login-swiper-dots">
          {BACKGROUND_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`login-swiper-dot ${index === currentIndex ? 'is-active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}: ${slide.title}`}
            />
          ))}
        </div>

        <span className="login-swiper-badge">
          {BACKGROUND_SLIDES[currentIndex].title}
        </span>

        <button
          type="button"
          className="login-swiper-btn"
          onClick={nextSlide}
          aria-label="Next background image"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export const AdminLogin = () => {
  const { authLoading, getRememberedEmail } = useAdmin();
  const rememberedEmail = getRememberedEmail();

  if (authLoading) {
    return (
      <div className="login-screen">
        <BackgroundSwiper />
        <div className="login-card" aria-busy="true" />
      </div>
    );
  }

  return (
    <div className="login-screen">
      <BackgroundSwiper />
      <PinLogin rememberedEmail={rememberedEmail} />
    </div>
  );
};

const PinLogin = ({ rememberedEmail }) => {
  const { signIn, forgetDevice } = useAdmin();
  const [email, setEmail] = useState(rememberedEmail || '');
  const [showEmailField, setShowEmailField] = useState(!rememberedEmail);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const fail = useCallback((message) => {
    setError(message);
    setShake(true);
    setPin('');
    window.setTimeout(() => setShake(false), 420);
  }, []);

  const submit = useCallback(async (candidatePin) => {
    if (!email.trim()) { fail('Enter your email first'); return; }
    setBusy(true);
    const result = await signIn(email.trim(), candidatePin);
    setBusy(false);
    if (!result.ok) fail(result.reason);
  }, [signIn, email, fail]);

  const digit = useCallback((d) => {
    setError('');
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH || busy) return prev;
      const next = prev + d;
      if (next.length === PIN_LENGTH) window.setTimeout(() => submit(next), 90);
      return next;
    });
  }, [busy, submit]);

  const backspace = useCallback(() => { setError(''); setPin((p) => p.slice(0, -1)); }, []);

  const notYou = useCallback(() => {
    forgetDevice();
    setEmail('');
    setShowEmailField(true);
    setPin('');
    setError('');
  }, [forgetDevice]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) { e.preventDefault(); digit(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [digit, backspace]);

  return (
    <div className="login-card" tabIndex={-1}>
      <div className="login-brand">
        <div className="login-wordmark">Zoom Imports</div>
        <div className="login-sub">Dealership portal</div>
      </div>

      {showEmailField ? (
        <div style={{ marginTop: '6px', marginBottom: '4px', textAlign: 'center' }}>
          <label className="field-label" htmlFor="login-email" style={{ textAlign: 'center' }}>Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            className="field"
            style={{ textAlign: 'center' }}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
          />
        </div>
      ) : (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '6px' }}>
          {email}
        </p>
      )}

      <label className="login-label" id="pin-label">Enter your PIN</label>

      <div className={`pin-dots${shake ? ' pin-shake' : ''}`} aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`pin-dot${i < pin.length ? ' is-filled' : ''}`} />
        ))}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {error || `${pin.length} of ${PIN_LENGTH} digits entered`}
      </span>

      <p className={`login-error${error ? ' is-shown' : ''}`} role="alert">
        {error || ' '}
      </p>

      <div className="pin-pad" role="group" aria-labelledby="pin-label">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="pin-key" onClick={() => digit(d)} disabled={busy}>{d}</button>
        ))}
        <span />
        <button type="button" className="pin-key" onClick={() => digit('0')} disabled={busy}>0</button>
        <button
          type="button"
          className="pin-key pin-key-alt"
          onClick={backspace}
          aria-label="Delete last digit"
          disabled={pin.length === 0 || busy}
        >
          <Delete size={18} />
        </button>
      </div>

      {busy && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
          <LogIn size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} /> Signing in…
        </p>
      )}

      {!showEmailField && (
        <button type="button" className="login-recover" onClick={notYou}>
          Not you?
        </button>
      )}
      {showEmailField && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textAlign: 'center', marginTop: '10px' }}>
          Forgot your PIN? Ask your Superadmin to reset it.
        </p>
      )}
    </div>
  );
};
