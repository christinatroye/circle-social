"use client";

import { useEffect, useRef } from "react";
import type { ArrivalData } from "@/lib/arrival";
import { startArrival } from "@/components/arrival-engine";
import { CircleMark } from "@/components/CircleMark";
import { ArrivalMusic } from "@/components/ArrivalMusic";
import { addThisDevice, claimLink, recommendFriend, logAfterStep, logReveal, sendFeedback, wantEarlyAccess, wantNextCircle, requestIntroduction, saveIntroduction, sawIntroduction, setCancelled, shareOnWall, heartWallPost, whoIsHere } from "./actions";

/** The drifting light in each Circle's own hue: the brightest tone, then two deeper ones. Alien's indigo unless a Circle has its own. */
const ORB: Record<string, [string, string, string]> = {
  perfect: ["232,190,140", "150,98,58", "92,58,34"],
};
const ORB_DEFAULT: [string, string, string] = ["150,150,225", "117,102,135", "68,57,79"];

export default function Arrival({ data }: { data: ArrivalData }) {
  const root = useRef<HTMLDivElement>(null);
  const orb = useRef<HTMLDivElement>(null);

  // Claiming the link sets a cookie, and Next.js then re-renders this page with fresh data.
  // Start the arrival once, from the data it opened with, so that refresh can't skip the door.
  const opened = useRef(data);

  useEffect(() => {
    const data = opened.current, { token } = data;
    return startArrival(root.current!, data, {
      claim: () => claimLink(token),
      sawIntroduction: () => sawIntroduction(token),
      saveIntroduction: input => saveIntroduction(token, input),
      setCancelled: cancelled => setCancelled(token, cancelled),
      requestIntroduction: (to, note) => requestIntroduction(token, to, note),
      whoIsHere: () => whoIsHere(token),
      addThisDevice: email => addThisDevice(token, email),
      recommendFriend: text => recommendFriend(token, text),
      wantNextCircle: () => wantNextCircle(token),
      wantEarlyAccess: () => wantEarlyAccess(token),
      logStep: step => logAfterStep(token, step),
      logReveal: step => logReveal(token, step),
      sendFeedback: line => sendFeedback(token, line),
      shareOnWall: text => shareOnWall(token, text),
      heartWallPost: (postId, on) => heartWallPost(token, postId, on),
    });
  }, []);

  // The drifting light from entercircle.co, in the room's hue.
  useEffect(() => {
    const [vig, main, core] = Array.from(orb.current!.children) as HTMLElement[];
    const [L, mid, deep] = ORB[opened.current.circle.slug] ?? ORB_DEFAULT;
    const paint = (x: number, y: number) => {
      const at = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
      vig.style.background = `radial-gradient(ellipse at ${at}, transparent 10%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.6) 100%)`;
      main.style.background = `radial-gradient(ellipse 120% 95% at ${at}, rgba(${L},0.16) 0%, rgba(${mid},0.09) 35%, rgba(${deep},0.04) 60%, transparent 80%)`;
      core.style.background = `radial-gradient(ellipse 70% 55% at ${at}, rgba(${L},0.07) 0%, rgba(${mid},0.03) 50%, transparent 75%)`;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { paint(50, 36); return; }
    let frame = 0, start = 0;
    const drift = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      paint(50 + Math.sin(t * 0.38) * 9 + Math.sin(t * 0.17) * 5, 36 + Math.cos(t * 0.28) * 7 + Math.cos(t * 0.21) * 4);
      frame = requestAnimationFrame(drift);
    };
    frame = requestAnimationFrame(drift);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      {/* Lets the page take this Circle's colours from the first paint, so nothing flickers. */}
      <div className="theme" data-circle={data.circle.slug} hidden />
      <div className="orb" aria-hidden="true" ref={orb}><div /><div className="orb-main" /><div className="orb-core" /></div>
      <div className="top" aria-hidden="true"><CircleMark className="mark" /><span>Circle</span></div>
      {/* Music only on the page after the evening; the arrival is silent. */}
      {data.phase === "after" && <ArrivalMusic src="/after-music.mp3" />}
      <main className="stage" ref={root}>
        <div className="ring" data-mode="door">
          <button className="hold" type="button" aria-label="Hold to enter"><span className="halo" /></button>
          <div className="centre" aria-live="polite" />
        </div>
        <div className="copy" aria-live="polite" />
      </main>
    </>
  );
}
