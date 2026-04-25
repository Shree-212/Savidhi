import type { Metadata } from 'next';
import { LegalPage, H2, P } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Savidhi',
  description: 'Cancellation, return and refund policy for purchases made on Savidhi.',
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Cancellation, Return & Refund Policy" lastUpdated="16th Jun 2023">
      <P>
        VAIDIK VIKHYAT ASTRO PRIVATE LIMITED, operating as Savidhi, prioritizes customer satisfaction.
        Customers unhappy with digital goods, physical products, subscriptions, or services may request
        cancellation, exchange, or refund within 15 days of purchase.
      </P>

      <H2>Cancellation Policy</H2>
      <P>
        Except for digital goods and services, customers can request order cancellation within 10 days
        of placement or before status updates to &ldquo;PUJA OFFERED&rdquo; (whichever occurs first).
      </P>
      <P>Digital goods and services cannot be cancelled post-purchase.</P>
      <P>
        Cancellation requests may be submitted through the Savidhi App, by email to{' '}
        <a className="text-primary-600 underline" href="mailto:support@savidhi.com">support@savidhi.com</a>,
        or by phone/WhatsApp at +91 9455567776 / +91 8234567890.
      </P>

      <H2>Return &amp; Refund Policy</H2>
      <P>
        A 10-day exchange/refund window applies to physical shipments following receipt. Only defective,
        damaged, or mis-shipped items qualify for return or replacement.
      </P>
      <P>
        To initiate a request, contact{' '}
        <a className="text-primary-600 underline" href="mailto:support@savidhi.com">support@savidhi.com</a>
        {' '}or call/WhatsApp the numbers above. Customers must provide images/videos documenting the
        shipment and the reason for return.
      </P>
      <P>
        When quality or quantity discrepancies exist between promised and received items, customers
        receive free replacement or full / partial refund eligibility.
      </P>
      <P>
        Full or partial refunds process within 3–7 business days to the original bank account.
        Replacements and exchanges ship within 5–7 business days.
      </P>
      <P>
        For policy questions, contact{' '}
        <a className="text-primary-600 underline" href="mailto:support@savidhi.com">support@savidhi.com</a>.
      </P>
    </LegalPage>
  );
}
