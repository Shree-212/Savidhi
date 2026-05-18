'use client';

import { Trash2, Upload } from 'lucide-react';
import { normaliseUrl } from './MediaUpload';

interface VideoPreviewProps {
  value: string;
  /** Trigger a re-upload flow. Caller decides how to open the file picker. */
  onReplace?: () => void;
  /** Clear the video. Caller is responsible for persisting the cleared state. */
  onRemove?: () => void;
  /** Visible label above the player; pass empty string to hide. */
  label?: string;
  /** Adds tight bottom margin when used as a sticky header inside a modal. */
  compact?: boolean;
  /** Hide action buttons (useful in read-only contexts). */
  readOnly?: boolean;
  className?: string;
}

/**
 * In-place video player + replace/remove controls. Renders a real HTML5
 * `<video controls>` so admins can scrub through to find timestamps. URL goes
 * through `normaliseUrl` so legacy `/uploads/` and GCS URLs both load
 * correctly via the media-service proxy.
 */
export function VideoPreview({
  value,
  onReplace,
  onRemove,
  label,
  compact,
  readOnly,
  className,
}: VideoPreviewProps) {
  if (!value) return null;
  const src = normaliseUrl(value);
  return (
    <div className={className}>
      {label !== undefined && label !== '' && (
        <p className="text-[10px] font-bold mb-1.5 text-muted-foreground uppercase tracking-wider">{label}</p>
      )}
      <div className={`rounded-lg overflow-hidden bg-black ${compact ? '' : 'mb-2'}`}>
        {/* `key` forces React to re-create the element when the URL changes,
            so a Replace-then-upload cycle resets the player without flicker. */}
        <video
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[40vh] bg-black"
        />
      </div>
      {!readOnly && (onReplace || onRemove) && (
        <div className="flex items-center gap-2 text-[11px]">
          {onReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="inline-flex items-center gap-1 px-2 h-7 rounded-md border border-border bg-accent text-foreground hover:text-primary"
            >
              <Upload className="w-3 h-3" /> Replace
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 px-2 h-7 rounded-md border border-border bg-accent text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
