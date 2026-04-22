/**
 * End-to-end payment helper for the mobile app.
 *
 * checkoutBooking() takes a freshly created booking and drives it through:
 *   1. POST /payments/create-order   (backend creates a Razorpay order + local row)
 *   2. Open Razorpay native checkout (via react-native-razorpay if installed,
 *      otherwise returns `stubbed: true` so dev without native SDK still works)
 *   3. POST /payments/verify         (backend validates HMAC signature, flips booking to PAID)
 *
 * The `react-native-razorpay` package requires a native rebuild on first install.
 * If it isn't installed, we fall back to directly verifying with a stub payload
 * so dev in the simulator stays unblocked — in production builds the real SDK
 * is loaded and the user sees the actual Razorpay modal.
 */

import { paymentService } from './index';

export type BookingType = 'PUJA' | 'CHADHAVA' | 'APPOINTMENT';

export interface CheckoutArgs {
  bookingType: BookingType;
  bookingId: string;
  amount: number;                                  // ₹ (not paise)
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

export interface CheckoutResult {
  success: boolean;
  paid: boolean;
  stubbed: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * Try to load react-native-razorpay. Returns null when the native module is
 * missing (dev without native rebuild) or in JS-only contexts (Jest tests).
 */
function loadRazorpayModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Razorpay = require('react-native-razorpay');
    // CommonJS default interop
    return Razorpay?.default ?? Razorpay;
  } catch {
    return null;
  }
}

export async function checkoutBooking(args: CheckoutArgs): Promise<CheckoutResult> {
  try {
    // 1. Create order
    const orderRes = await paymentService.createOrder({
      booking_type: args.bookingType,
      booking_id: args.bookingId,
      amount: args.amount,
    });
    const pay = orderRes.data?.data;
    if (!pay?.gateway_order_id) {
      return { success: false, paid: false, stubbed: false, error: 'Could not create order' };
    }

    const isStubServer = !!pay.stub;
    const Razorpay = loadRazorpayModule();

    // 2a. Dev path — either server has no Razorpay keys, or the native SDK
    //     isn't installed. Bypass the checkout modal and directly verify with
    //     a synthetic payment id so we can test the full pipeline on the simulator.
    if (isStubServer || !Razorpay) {
      await paymentService.verify({
        payment_id: pay.id,
        gateway_order_id: pay.gateway_order_id,
        gateway_payment_id: `pay_stub_${Date.now()}`,
        gateway_signature: 'stub',
      });
      return { success: true, paid: true, stubbed: true, paymentId: pay.id };
    }

    // 2b. Production path — open the real Razorpay modal
    const options = {
      key: pay.razorpay_key_id,
      order_id: pay.gateway_order_id,
      amount: Math.round(args.amount * 100),
      currency: 'INR',
      name: 'Savidhi',
      description: args.description,
      prefill: args.prefill,
      theme: { color: '#E8813A' },
    };

    let rzpResponse: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
    try {
      rzpResponse = await Razorpay.open(options);
    } catch (err: any) {
      // User dismissed or payment failed
      return {
        success: false,
        paid: false,
        stubbed: false,
        error: err?.description ?? err?.message ?? 'Payment cancelled',
      };
    }

    // 3. Verify with backend
    await paymentService.verify({
      payment_id: pay.id,
      gateway_order_id: rzpResponse.razorpay_order_id,
      gateway_payment_id: rzpResponse.razorpay_payment_id,
      gateway_signature: rzpResponse.razorpay_signature,
    });

    return { success: true, paid: true, stubbed: false, paymentId: pay.id };
  } catch (err: any) {
    return {
      success: false,
      paid: false,
      stubbed: false,
      error: err?.response?.data?.message ?? err?.message ?? 'Payment failed',
    };
  }
}
