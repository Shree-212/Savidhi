/**
 * Thin wrapper around the Razorpay Checkout.js v1 script.
 *
 * Usage:
 *   import { loadRazorpay, openCheckout } from '@/lib/razorpay';
 *   const Razorpay = await loadRazorpay();
 *   openCheckout(Razorpay, { key, order, onSuccess, onFailure, onDismiss });
 */

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<any> | null = null;

export function loadRazorpay(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay only loads in the browser'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay script')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
  return loadPromise;
}

export interface OpenCheckoutArgs {
  key: string;
  order: { id: string; amount: number; currency?: string };
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  onSuccess: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onFailure?: (response: { code?: string; description?: string; source?: string; step?: string; reason?: string; metadata?: Record<string, string> }) => void;
  onDismiss?: () => void;
}

export function openCheckout(Razorpay: any, args: OpenCheckoutArgs): void {
  const rzp = new Razorpay({
    key: args.key,
    order_id: args.order.id,
    amount: args.order.amount,
    currency: args.order.currency ?? 'INR',
    name: args.name ?? 'Savidhi',
    description: args.description ?? 'Spiritual Services',
    prefill: args.prefill,
    notes: args.notes,
    theme: { color: args.theme?.color ?? '#E8813A' },
    modal: {
      ondismiss: () => args.onDismiss?.(),
    },
    handler: (response: any) => args.onSuccess(response),
  });
  rzp.on('payment.failed', (response: any) => args.onFailure?.(response.error ?? response));
  rzp.open();
}
