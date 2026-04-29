'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  className?: string;
  poster?: string;
}

/** Inline HTML5 video player. Click the play overlay → starts playing in
 *  place (no new tab). Uses native browser controls once started. */
export function VideoPlayer({ src, className, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const handlePlay = () => {
    setStarted(true);
    requestAnimationFrame(() => {
      void videoRef.current?.play();
    });
  };

  return (
    <div
      className={
        className ??
        'relative h-48 sm:h-56 rounded-xl overflow-hidden bg-gradient-to-br from-black to-zinc-800 ring-1 ring-black/10'
      }
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={started}
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-contain bg-black"
      />
      {!started && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center group cursor-pointer"
        >
          <span className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-primary-500 ml-0.5 fill-primary-500" />
          </span>
        </button>
      )}
    </div>
  );
}
