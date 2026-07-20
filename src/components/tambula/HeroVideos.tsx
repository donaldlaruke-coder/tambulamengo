import hero1 from "@/assets/hero-1.mp4.asset.json";
import hero2 from "@/assets/hero-2.mp4.asset.json";
import hero3 from "@/assets/hero-3.mp4.asset.json";
import hero4 from "@/assets/hero-4.mp4.asset.json";
import hero5 from "@/assets/hero-5.mp4.asset.json";

const clips = [hero1, hero2, hero3, hero4, hero5];

export function HeroVideoWall() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-3 gap-0.5 opacity-40 md:opacity-55">
        {clips.map((c, i) => (
          <video
            key={i}
            src={c.url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className={`h-full w-full object-cover ${i === 4 ? "hidden md:block" : ""}`}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/75 to-primary" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--color-gold)_35%,transparent),transparent_55%)]" />
    </div>
  );
}

export function VideoStrip() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {clips.slice(0, 4).map((c, i) => (
        <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl card-heritage">
          <video
            src={c.url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
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