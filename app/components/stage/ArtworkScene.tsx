"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import ArtworkLoadingCover from "./ArtworkLoadingCover.tsx";
import { useArtworkReady } from "./use-artwork-ready.ts";

// Společný obal samostatných herních scén (/automaty, /skorapky, /losy):
// aspect-ratio container (aby nikdy nedošlo k layout shiftu — rozměry jsou
// předem známé z konstant scény) + artwork jako `next/image` + živé overlaye.
//
// Overlay obsah se renderuje, až když je artwork skutečně načtený (viz
// use-artwork-ready.ts), takže na pomalém připojení neprobliknou tlačítka a
// texty na prázdném pozadí a nedají se omylem kliknout. Do té doby (a při
// načítání z cache už ne) scénu překrývá retro loader.
//
// Uvnitř je jen `relative` kontejner bez vlastní velikosti — děti se
// pozicují v % vůči němu (stejně jako dřív), takže se nic nemění na
// stávajících souřadnicích overlayů.
export default function ArtworkScene({
  src,
  alt,
  width,
  height,
  loadingLabel,
  className,
  children,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  loadingLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const status = useArtworkReady(src);

  return (
    <div className={className} style={{ aspectRatio: `${width} / ${height}` }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        className="absolute inset-0 h-full w-full object-contain"
      />

      {status !== "loading" && <div className="animate-gembl-fade-in">{children}</div>}

      <ArtworkLoadingCover status={status} label={loadingLabel} />
    </div>
  );
}
