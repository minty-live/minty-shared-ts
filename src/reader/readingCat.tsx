"use client";

/**
 * The reading cat (the user, 2026-11-26): while a receipt or invoice is read, Minty at her laptop
 * plays in a loop, and goes the moment the answer (or an error) arrives - the form shows it only
 * while `useDocumentReader`'s `reading` is true.
 *
 * Words by use: for 24 hours from a person's first answered read (`ReaderStatus.first_read_at`,
 * worked out by the API from `ai_read`), and before it, "Minty is reading your receipt…"; after
 * that, "Reading…". The cat is the same size either way (the user, 2026-11-26; `size` names the
 * words, not the picture). Under reduce motion, the still frame.
 *
 * The files are each app's to serve (`READING_CAT_ASSETS`, from `public/reader/`; Next cannot
 * serve a file out of node_modules): a 480x270, 5 s silent loop as VP9 WebM (~140 KB) and
 * baseline H.264 MP4 (~170 KB, for Safari without VP9), and one WebP frame. The video's
 * background is white, so it sits on the card's white.
 */

import { useEffect, useRef, useState } from "react";

import type { ReaderStatus } from "./allowance";
import type { ReadDocument } from "./core";

export const READING_CAT_WEBM = "/reader/minty-reading.webm";
export const READING_CAT_MP4 = "/reader/minty-reading.mp4";
export const READING_CAT_STILL = "/reader/minty-reading-still.webp";
/** Every file the reading cat draws: each app serves them (its packaged-assets test). */
export const READING_CAT_ASSETS = [READING_CAT_WEBM, READING_CAT_MP4, READING_CAT_STILL] as const;

export type ReadingCatSize = "large" | "small";

/** The large cat's time: 24 hours from the person's first answered read. */
export const LARGE_READING_CAT_MS = 24 * 60 * 60 * 1000;

/** Large before a person's first read and for a day after it, small from then on. */
export function readingCatSize(
  status: ReaderStatus | null | undefined,
  now: number = Date.now(),
): ReadingCatSize {
  const first = status?.first_read_at ? Date.parse(status.first_read_at) : NaN;
  if (Number.isNaN(first)) return "large";
  return now - first < LARGE_READING_CAT_MS ? "large" : "small";
}

/** The words beside the cat (the user's, 2026-11-26: "Minty", never "Minty AI"). */
export function readingCatText(size: ReadingCatSize, document: ReadDocument): string {
  return size === "large" ? `Minty is reading your ${document}…` : "Reading…";
}

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

/** Whether the person asked for less motion - live, so a change while reading takes effect. */
function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCE_MOTION);
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduce;
}

/** The loop, or the still frame under reduce motion. Decoration only: the words are the status. */
function CatPicture({ className }: { className: string }) {
  const reduce = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    // Browsers autoplay only a muted video, and React sets `muted` as a property after the element
    // is in the page - too late for `autoplay`'s check (it stayed paused at 0 in Chromium). So: mute
    // it, say so as an attribute too (iOS), and start it ourselves. A refused play() keeps the poster.
    const el = video.current;
    if (!el) return;
    el.muted = true;
    el.setAttribute("muted", "");
    const playing = el.play?.();
    if (playing && typeof playing.catch === "function") playing.catch(() => undefined);
  }, [reduce]);
  if (reduce)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a packaged component cannot use next/image's loader config
      <img
        src={READING_CAT_STILL}
        alt=""
        aria-hidden="true"
        width={480}
        height={270}
        className={className}
      />
    );
  return (
    <video
      ref={video}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={READING_CAT_STILL}
      aria-hidden="true"
      width={480}
      height={270}
      className={className}
    >
      <source src={READING_CAT_WEBM} type="video/webm" />
      <source src={READING_CAT_MP4} type="video/mp4" />
    </video>
  );
}

/**
 * Minty reading: centred on a white card, the cat up to 240px wide (the card's width on a phone),
 * the words under it. One cat for everyone (the user, 2026-11-26: "no difference in sizing") - the
 * size only picks the words: `large` "Minty is reading your receipt…", `small` "Reading…". A
 * status, never an alert; shown only while reading.
 *
 * `place="zone"` (the user, 2026-11-26): drawn IN the upload box's slot while the read runs - no
 * margins, at least the box's 156px tall, filling the slot. The app puts it where its drop zone
 * was and brings the zone back when the read ends. `className` adds the app's own sizes (e.g. the
 * zone's taller `sm:` height).
 */
export function ReadingCat({
  size,
  document,
  place = "below",
  className = "",
}: {
  size: ReadingCatSize;
  document: ReadDocument;
  place?: "below" | "zone";
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center rounded-[12px] border border-border-default bg-surface-card px-4 py-3 text-center ${place === "zone" ? "min-h-[156px] w-full" : "mb-1 mt-3"}${className ? ` ${className}` : ""}`}
    >
      <CatPicture className="aspect-video h-auto w-full max-w-[240px] object-contain" />
      <p className="mt-2 break-words text-sm font-medium text-text-link">
        {readingCatText(size, document)}
      </p>
    </div>
  );
}
