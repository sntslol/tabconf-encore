import React from "react";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const poster = await sharp(await readFile("public/brand/tabconf8-poster.webp"))
  .resize(340, 518).png().toBuffer();
const logo = await readFile("public/brand/tabconf-question-logo.png");
const logoSize = await sharp(logo).metadata();
const sans = await readFile("public/fonts/instrument-sans-600.ttf");
const mono = await readFile("public/fonts/jetbrains-mono-500.ttf");
const image = new ImageResponse(
  <div style={{ display: "flex", width: "100%", height: "100%", background: "#080a0c", padding: 30 }}>
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#12161c", border: "1px solid #242a32", borderRadius: 10, padding: 26, gap: 40 }}>
      <img src={`data:image/png;base64,${poster.toString("base64")}`} width={340} height={518} style={{ borderRadius: 8 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: "#e6eaef", fontFamily: "Instrument Sans" }}>
        <div style={{ fontFamily: "JetBrains Mono", color: "#8b95a5", fontSize: 17, letterSpacing: 2, marginBottom: 14 }}>A VERY REASONABLE PLEA</div>
        <img src={`data:image/png;base64,${logo.toString("base64")}`} width={290} height={Math.round(290 * logoSize.height! / logoSize.width!)} />
        <div style={{ display: "flex", gap: 16, fontFamily: "JetBrains Mono", fontSize: 51, letterSpacing: -2, marginTop: 18 }}><span style={{ color: "#fbbf24" }}>SAVE</span><span>TABCONF</span></div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 17, letterSpacing: 4, color: "#6ee7a8", marginTop: 8 }}>ENCORE</div>
        <div style={{ fontSize: 26, color: "#b8c0cc", marginTop: 12 }}>Please don’t roll the credits yet.</div>
        <div style={{ display: "flex", padding: "16px 30px", borderRadius: 6, background: "linear-gradient(180deg, #f59e0b, #d97706)", color: "#080a0c", fontSize: 23, marginTop: 28 }}>Sign for one more year ↗</div>
        <div style={{ fontFamily: "JetBrains Mono", color: "#6ee7a8", fontSize: 15, marginTop: 24 }}>savetabconf.com</div>
      </div>
    </div>
  </div>,
  { width: 1200, height: 630, fonts: [
    { name: "Instrument Sans", data: sans, weight: 600, style: "normal" },
    { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
  ] },
);
await writeFile("public/og.png", Buffer.from(await image.arrayBuffer()));
console.log("Created public/og.png (1200 × 630)");
