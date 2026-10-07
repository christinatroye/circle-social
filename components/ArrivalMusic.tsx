"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Quiet music for the arrival page, on unless the guest turns it off with the sound mark.
 * Their choice is remembered on this device. It falls silent as they enter the room.
 */

const LEVEL = 0.3;
const KEY = "circle-music";

type Player = { audio: HTMLAudioElement; ctx: AudioContext; gain: GainNode };

const remembered = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const remember = (v: "on" | "off") => { try { localStorage.setItem(KEY, v); } catch {} };

/** `src` is the track: the arrival music, or a different one for the page after the evening. */
export function ArrivalMusic({ src = "/arrival-music.mp3" }: { src?: string }) {
  const player = useRef<Player | null>(null);
  const toggle = useRef<{ start: () => void; stop: (seconds: number) => void } | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    // Built inside a touch, so iOS lets it play. The gain node lets it fade there too.
    const unlock = () => {
      if (!player.current) {
        const audio = new Audio(src);
        audio.loop = true;
        const ctx = new AudioContext();
        // The mark shows sound only once it is really audible.
        const sync = () => { if (!audio.paused && ctx.state === "running") setOn(true); };
        audio.addEventListener("playing", sync);
        ctx.addEventListener("statechange", sync);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
        player.current = { audio, ctx, gain };
      }
      const p = player.current;
      void p.ctx.resume();
      void p.audio.play().catch(() => {});
      return p;
    };
    const fadeTo = (level: number, seconds: number) => {
      const p = player.current;
      if (!p) return;
      const g = p.gain.gain, now = p.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(level, now + seconds);
    };
    const start = () => { unlock(); fadeTo(LEVEL, 4); };
    const stop = (seconds: number) => {
      fadeTo(0, seconds);
      const p = player.current;
      if (p) setTimeout(() => { if (p.gain.gain.value < 0.01) p.audio.pause(); }, seconds * 1000 + 50);
      setOn(false);
    };

    // On by default. Browsers usually hold sound until the first touch or key, so try now and
    // again on each early touch until it is actually playing, unless the guest turned it off.
    const playing = () => !!player.current && !player.current.audio.paused && player.current.ctx.state === "running";
    const kick = (e?: Event) => {
      if (e && (e.target as HTMLElement).closest?.(".music")) return;
      if (remembered() === "off" || playing()) return done();
      start();
    };
    const KICKS = ["pointerdown", "pointerup", "touchend", "keydown"] as const;
    const done = () => KICKS.forEach(ev => document.removeEventListener(ev, kick, true));
    KICKS.forEach(ev => document.addEventListener(ev, kick, true));
    kick();

    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("#enter-now")) stop(1.2);
    };

    // Silent while the page is out of sight.
    const onVisibility = () => {
      const p = player.current;
      if (!p) return;
      if (document.hidden) void p.ctx.suspend();
      else void p.ctx.resume();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    toggle.current = { start, stop };
    return () => {
      done();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      const p = player.current;
      if (p) { p.audio.pause(); void p.ctx.close(); player.current = null; }
    };
  }, [src]);

  return (
    <button
      className={on ? "music on" : "music"}
      type="button"
      aria-label={on ? "Turn music off" : "Turn music on"}
      aria-pressed={on}
      onClick={() => {
        if (on) { remember("off"); toggle.current?.stop(1.5); }
        else { remember("on"); toggle.current?.start(); }
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
        <path className="wave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
      </svg>
    </button>
  );
}
