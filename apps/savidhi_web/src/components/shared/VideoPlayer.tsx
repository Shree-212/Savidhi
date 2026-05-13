'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  className?: string;
  poster?: string;
  onPlay?: () => void;
}

export interface VideoPlayerHandle {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
  getVideo: () => HTMLVideoElement | null;
}

function isHls(src: string): boolean {
  return /\.m3u8(\?|$)/i.test(src);
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { src, className, poster, onPlay },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  useImperativeHandle(ref, () => ({
    pause: () => videoRef.current?.pause(),
    play: () => { void videoRef.current?.play(); setStarted(true); },
    seekTo: (s: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = s;
      void v.play();
      setStarted(true);
    },
    getVideo: () => videoRef.current,
  }), []);

  // Attach HLS via dynamic import if the source is an .m3u8 and the browser
  // lacks native HLS support (everything except Safari).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (!isHls(src)) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari) — no-op, the plain src on the <video> works.
      return;
    }
    let cancelled = false;
    let hls: any = null;
    (async () => {
      try {
        const mod = await import('hls.js');
        if (cancelled) return;
        const Hls = mod.default;
        if (!Hls.isSupported()) return;
        hls = new Hls({ maxBufferLength: 30, lowLatencyMode: false, startLevel: -1 });
        hls.loadSource(src);
        hls.attachMedia(video);
      } catch {
        // hls.js missing or failed — fall back to native src
      }
    })();
    return () => {
      cancelled = true;
      if (hls) { try { hls.destroy(); } catch { /* noop */ } }
    };
  }, [src]);

  const handlePlay = () => {
    setStarted(true);
    requestAnimationFrame(() => { void videoRef.current?.play(); });
  };

  // For HLS we don't put src on the <video> tag; hls.js attaches the buffer.
  const useNativeSrc = !isHls(src) || (typeof window !== 'undefined' && videoRef.current?.canPlayType('application/vnd.apple.mpegurl'));

  return (
    <div
      className={
        className ??
        'relative h-48 sm:h-56 rounded-xl overflow-hidden bg-gradient-to-br from-black to-zinc-800 ring-1 ring-black/10'
      }
    >
      <video
        ref={videoRef}
        src={useNativeSrc ? src : undefined}
        poster={poster}
        controls={started}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onPlay={onPlay}
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
});
