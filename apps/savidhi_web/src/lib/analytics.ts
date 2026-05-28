// Lightweight, provider-agnostic conversion tracking. The four events we care
// about for paid ads — landing-page view, add-to-cart (Book Now clicked),
// initiate-checkout (proceed to payment), purchase (payment verified) — are
// fanned out to whichever pixels are loaded on the page.
//
// Pixels themselves are conditionally injected from layout.tsx based on env
// vars (NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_GA4_ID). If neither is set the
// helper is a no-op in production and just logs in dev.

type EventName = 'view_content' | 'add_to_cart' | 'initiate_checkout' | 'purchase';

// Meta uses TitleCase standard events; mapping keeps callers simple.
const META_EVENT: Record<EventName, string> = {
  view_content: 'ViewContent',
  add_to_cart: 'AddToCart',
  initiate_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
};

interface FbqWindow {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
}

export function trackEvent(name: EventName, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as FbqWindow;

  try {
    if (typeof w.fbq === 'function') {
      w.fbq('track', META_EVENT[name], payload ?? {});
    }
  } catch { /* never let analytics throw into the app */ }

  try {
    if (typeof w.gtag === 'function') {
      w.gtag('event', name, payload ?? {});
    }
  } catch { /* same */ }

  if (process.env.NODE_ENV !== 'production') {
    // Dev visibility so we can confirm the funnel without opening the Pixel Helper.
    // eslint-disable-next-line no-console
    console.log('[track]', name, payload ?? {});
  }
}
