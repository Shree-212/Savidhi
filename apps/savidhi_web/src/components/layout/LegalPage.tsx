import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Shared chrome for all policy / legal pages: terms, privacy, refund, vendor.
 * Provides a top-bar back link, page heading, "last updated" line, and a
 * narrow reading-width content column with consistent prose typography.
 */
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="section-container max-w-3xl pt-4 sm:pt-6 pb-10 sm:pb-14">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-500 transition group"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center group-hover:border-primary-300 group-hover:bg-primary-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span>Home</span>
          </Link>
        </div>

        <header className="mb-8 pb-6 border-b border-orange-100">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-text-muted mt-2">Last updated: {lastUpdated}</p>
        </header>

        <article className="prose-savidhi space-y-5 text-[15px] leading-relaxed text-text-secondary">
          {children}
        </article>
      </div>
    </div>
  );
}

/* Section / sub-section helpers — used inside LegalPage children to keep the
 * detail pages readable. Imported alongside <LegalPage>. */

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-text-primary mt-8 mb-3 tracking-tight">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-base sm:text-lg font-bold text-text-primary mt-5 mb-2">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-text-secondary">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-text-secondary marker:text-primary-400">{children}</ul>;
}

export function OL({ children }: { children: ReactNode }) {
  return <ol className="list-decimal pl-5 space-y-1.5 text-text-secondary marker:text-primary-500 marker:font-semibold">{children}</ol>;
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm italic text-text-muted bg-orange-50/40 border-l-2 border-primary-300 pl-4 py-2">
      {children}
    </p>
  );
}
