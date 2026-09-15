"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Pomalý crossfade slideshow pozadí stage (viz zadání "decentní, retro,
// atmosférické přechody, ne blikání"). Používá stávající `next/image`
// (žádná nová knihovna) — snímky jsou předem optimalizované WebP ve stejných
// designových rozměrech jako skin (viz public/skins/classic/), proto
// `unoptimized` (Next by je jen zbytečně přeoptimalizovával a měnil URL).
//
// Chování:
// - všechny snímky se PŘEDNAČTOU při mountu (`new window.Image()`), rotace se
//   spustí, až když jsou opravdu v cache → při přepnutí nikdy neproblikne
//   prázdné pozadí,
// - do té doby (a bez JS) je vidět první snímek jako běžné <Image priority>,
//   žádné skrývání ani layout shift,
// - `prefers-reduced-motion: reduce` rotaci úplně vypne (zůstane první snímek).
const ROTATE_MS = 7000;
const FADE_MS = 1600;

export default function StageBackground({
  alt,
  frames,
  width,
  height,
}: {
  alt: string;
  frames: string[];
  width: number;
  height: number;
}) {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  // `frames` je modulová konstanta ze skinu (stabilní identita), ale pro
  // jistotu závisíme na string klíči, ne na referenci pole.
  const frameKey = frames.join("|");

  useEffect(() => {
    const urls = frameKey.split("|").filter(Boolean);
    if (urls.length <= 1) {
      setReady(true);
      return;
    }

    let cancelled = false;
    let remaining = urls.length;

    function done() {
      remaining -= 1;
      if (!cancelled && remaining <= 0) setReady(true);
    }

    const preloaded = urls.map((url) => {
      const image = new window.Image();
      image.onload = done;
      image.onerror = done;
      image.src = url;
      return image;
    });

    return () => {
      cancelled = true;
      for (const image of preloaded) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [frameKey]);

  useEffect(() => {
    const count = frames.length;
    if (!ready || count <= 1) return;
    // Respektuj systémové nastavení "omezit pohyb" — žádná rotace, jen
    // statický první snímek (fallback bez layout shiftu).
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => setActive((current) => (current + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [ready, frames.length]);

  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
      {frames.map((url, index) => (
        <Image
          key={url}
          src={url}
          alt={index === 0 ? alt : ""}
          aria-hidden={index === 0 ? undefined : true}
          width={width}
          height={height}
          priority={index === 0}
          unoptimized
          className="absolute inset-0 h-full w-full select-none object-cover transition-opacity ease-in-out"
          style={{ opacity: index === active ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
    </div>
  );
}
