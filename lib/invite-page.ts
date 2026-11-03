import { readFileSync } from "node:fs";
import type { Metadata } from "next";

/**
 * Metadata for a Circle's invite page (/trust/invite), the version Christina sends to people she invites personally.
 * Same title, description and link preview as the public page, with its own address, and kept out of search results.
 */
export function inviteMetadata(publicPage: Metadata, slug: string): Metadata {
  // The preview image lives beside the public page; file-based images don't carry over to /invite, so name it here.
  const image = { url: `/${slug}/opengraph-image.jpg`, width: 1200, height: 630, alt: altText(slug) };
  return {
    ...publicPage,
    robots: { index: false, follow: false },
    openGraph: { ...publicPage.openGraph, url: `/${slug}/invite`, images: [image] },
    twitter: { ...publicPage.twitter, images: [image] },
  };
}

function altText(slug: string) {
  try { return readFileSync(`${process.cwd()}/app/${slug}/opengraph-image.alt.txt`, "utf8").trim(); } catch { return undefined; }
}
