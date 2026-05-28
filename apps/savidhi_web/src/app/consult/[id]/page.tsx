import { redirect } from 'next/navigation';

// Consult is intentionally disabled at the route level for the May-2026 launch
// (see /memory/project_astrologer_ui_disabled.md). The new LP design lives in
// `@/components/shared/ConsultDetailContent` and is wired against the same
// astrologerService + ConsultBookingSheet that powers other surfaces.
//
// To re-enable consult after launch, delete the redirect call below and use:
//
//   import { use } from 'react';
//   import { ConsultDetailContent } from '@/components/shared/ConsultDetailContent';
//
//   export default function Page({ params }: { params: Promise<{ id: string }> }) {
//     const { id } = use(params);
//     return <ConsultDetailContent id={id} />;
//   }

export default function ConsultDetailDisabledPage() {
  redirect('/');
}
