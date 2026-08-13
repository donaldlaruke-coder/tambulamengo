import { useEffect, useRef, useState } from "react";
import hero1 from "@/assets/hero-1.mp4.asset.json";
import hero2 from "@/assets/hero-2.mp4.asset.json";
import hero3 from "@/assets/hero-3.mp4.asset.json";
import hero4 from "@/assets/hero-4.mp4.asset.json";
import hero5 from "@/assets/hero-5.mp4.asset.json";
import poster1 from "@/assets/hero-1-poster.jpg";
import poster2 from "@/assets/hero-2-poster.jpg";
import poster3 from "@/assets/hero-3-poster.jpg";
import poster4 from "@/assets/hero-4-poster.jpg";
import poster5 from "@/assets/hero-5-poster.jpg";

const clips = [
  { url: hero1.url, poster: poster1 },
  { url: hero2.url, poster: poster2 },
  { url: hero3.url, poster: poster3 },
  { url: hero4.url, poster: poster4 },
  { url: hero5.url, poster: poster5 },
];

/**
 * Decide whether we're allowed to autoplay video on this device / connection.
 * Respects Save-Data, slow effective connection types, and reduced motion.
 */
function useAllowVideo() {
  const [allow, setAllow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn: any = (navigator as any).connection;
    const saveData = !!conn?.saveData;
    const slow = conn?.effectiveType && /(^|-)2g|slow-2g/i.test(conn.effectiveType);
    if (reduced || saveData || slow) {
      setAllow(false);
      return;
    }
    setAllow(true);
  }, []);
  return allow;
}

/** Lazy-mount a <video> with staggered delay to prevent network bandwidth spikes */
function LazyVideo({
  src,
  poster,
  className,
  allow,
  priority = false,
  delayMs = 0,
  isPlayer = true,
}: {
  src: string;
  poster: string;
  className?: string;
  allow: boolean;
  priority?: boolean;
  delayMs?: number;
  isPlayer?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(priority);
  const [readyToStream, setReadyToStream] = useState(false);

  useEffect(() => {
    if (!isPlayer) return;
    if (priority) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, isPlayer]);

  // Stagger video mount after initial page paint is complete
  useEffect(() => {
    if (!isPlayer) return;
    if (!inView || !allow) return;
    const timer = setTimeout(() => {
      setReadyToStream(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [inView, allow, delayMs, isPlayer]);

  // Pause when off-screen to save CPU / battery / data.
  useEffect(() => {
    if (!isPlayer) return;
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [readyToStream, isPlayer]);

  const shouldMountVideo = isPlayer && inView && allow && readyToStream;

  return (
    <div ref={wrapRef} className={className} style={{ backgroundColor: "#3a0e15", transform: "translateZ(0)" }}>
      {shouldMountVideo ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover transition-opacity duration-700"
          style={{ willChange: "transform" }}
        />
      ) : (
        <img
          src={poster}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function HeroVideoWall() {
  const allow = useAllowVideo();
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-3 gap-0.5 opacity-40 md:opacity-55">
        {clips.map((c, i) => (
          <LazyVideo
            key={i}
            src={c.url}
            poster={c.poster}
            allow={allow}
            priority={i === 1}
            isPlayer={i === 1}
            delayMs={0}
            className={`relative h-full w-full overflow-hidden ${i === 4 ? "hidden md:block" : ""}`}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/75 to-primary" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--color-gold)_35%,transparent),transparent_55%)]" />
    </div>
  );
}

export function VideoStrip() {
  const allow = useAllowVideo();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {clips.slice(0, 4).map((c, i) => (
        <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl card-heritage">
          <LazyVideo
            src={c.url}
            poster={c.poster}
            allow={allow}
            isPlayer={false}
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent p-3">
            <div className="text-[10px] uppercase tracking-widest text-gold">Mengo</div>
            <div className="text-xs text-white font-semibold">Life on the hill</div>
          </div>
        </div>
      ))}
    </div>
  );
}