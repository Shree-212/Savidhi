'use client';

import { useRef } from 'react';
import { VideoPlayer, type VideoPlayerHandle } from '@/components/shared/VideoPlayer';
import { normaliseMediaUrl } from '@/lib/utils';
import { SankalpTimestamps, type SankalpTimestamp } from './SankalpTimestamps';

interface YourVideosCardProps {
  shortVideoUrl?: string | null;
  sankalpVideoUrl?: string | null;
  sankalpTimestamps?: SankalpTimestamp[];
}

/** "Your Videos" card. Used on both puja and chadhava booking-details pages.
 *  When both players are present, playing one pauses the other. */
export function YourVideosCard({ shortVideoUrl, sankalpVideoUrl, sankalpTimestamps }: YourVideosCardProps) {
  const shortRef = useRef<VideoPlayerHandle>(null);
  const sankalpRef = useRef<VideoPlayerHandle>(null);

  if (!shortVideoUrl && !sankalpVideoUrl) return null;

  return (
    <div className="bg-white border border-orange-100 rounded-xl p-4 mb-5 shadow-sm">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Your Videos</h3>
      <div className="space-y-4">
        {shortVideoUrl && (
          <div>
            <p className="text-xs font-semibold text-text-primary mb-2">Short Puja Video</p>
            <VideoPlayer
              ref={shortRef}
              src={normaliseMediaUrl(shortVideoUrl)}
              onPlay={() => sankalpRef.current?.pause()}
              className="relative h-48 sm:h-56 rounded-xl overflow-hidden bg-black ring-1 ring-black/10"
            />
          </div>
        )}
        {sankalpVideoUrl && (
          <div>
            <p className="text-xs font-semibold text-text-primary mb-2">Sankalp Video</p>
            <VideoPlayer
              ref={sankalpRef}
              src={normaliseMediaUrl(sankalpVideoUrl)}
              onPlay={() => shortRef.current?.pause()}
              className="relative h-48 sm:h-56 rounded-xl overflow-hidden bg-black ring-1 ring-black/10"
            />
            {sankalpTimestamps && sankalpTimestamps.length > 0 && (
              <SankalpTimestamps
                timestamps={sankalpTimestamps}
                onSeek={(s) => sankalpRef.current?.seekTo(s)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
