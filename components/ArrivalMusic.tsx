"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Quiet music for the arrival page. Browsers only allow sound after a touch, so it rises as the
 * guest holds the door. Anyone coming back later skips the door: for them it stays off until they
 * touch the sound mark. Their choice is remembered on this device. It falls silent as they enter the room.
 */

const SRC = "/arrival-music.mp3";
const LEVEL = 0.3;
const KEY = "circle-music";

type Player = { audio: HTMLAudioElement; ctx: AudioContext; gain: GainNode };

const remembered = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const remember = (v: "on" | "off") => { try { localStorage.setItem(KEY, v); } catch {} };

export function ArrivalMusic() {
  const player = useRef<Player | null>(null);
  const toggle = useRef<{ start: () => void; stop: (seconds: number) => void } | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    // Built inside a touch, so iOS lets it play. The gain node lets it fade there too.
    const unlock = () => {
      if (!player.current) {
        const audio = new Audio(SRC);
        audio.loop = true;
        const ctx = new AudioContext();
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
    const start = () => { unlock(); fadeTo(LEVEL, 4); setOn(true); };
    const stop = (seconds: number) => {
      fadeTo(0, seconds);
      const p = player.current;
      if (p) setTimeout(() => { if (p.gain.gain.value < 0.01) p.audio.pause(); }, seconds * 1000 + 50);
      setOn(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".music")) return;
      const choice = remembered();
      // Holding the door: get ready in silence, rise once they are through.
      if (target.closest(".hold") && choice !== "off") { unlock(); return; }
      // Back again, having chosen music last time: the first touch brings it back.
      if (choice === "on" && !player.current?.audio.played.length) start();
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("#enter-now")) stop(1.2);
    };
    // Through the door: the music rises, once.
    let rose = false;
    const inside = new MutationObserver(() => {
      if (rose || !document.body.classList.contains("inside") || !player.current) return;
      rose = true;
      if (remembered() !== "off") start();
    });
    inside.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // Silent while the page is out of sight.
    const onVisibility = () => {
      const p = player.current;
      if (!p) return;
      if (document.hidden) void p.ctx.suspend();
      else void p.ctx.resume();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    toggle.current = { start, stop };
    return () => {
      inside.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      const p = player.current;
      if (p) { p.audio.pause(); void p.ctx.close(); player.current = null; }
    };
  }, []);

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
