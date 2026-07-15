"use client";

import { memo } from "react";
import type { AgentCharacterStyle, HairStyle } from "@/lib/office/characters";

function Hair({ style, color }: { style: HairStyle; color: string }) {
  if (style === "curly") {
    return (
      <g>
        <circle cx="20" cy="9" r="7" fill={color} />
        <circle cx="14" cy="11" r="4" fill={color} />
        <circle cx="26" cy="11" r="4" fill={color} />
      </g>
    );
  }
  if (style === "long") {
    return (
      <g>
        <ellipse cx="20" cy="10" rx="8" ry="7" fill={color} />
        <rect x="12" y="12" width="16" height="10" rx="4" fill={color} />
      </g>
    );
  }
  if (style === "bun") {
    return (
      <g>
        <ellipse cx="20" cy="10" rx="7" ry="6" fill={color} />
        <circle cx="26" cy="6" r="4" fill={color} />
      </g>
    );
  }
  if (style === "bob") {
    return (
      <g>
        <ellipse cx="20" cy="10" rx="8" ry="7" fill={color} />
        <rect x="11" y="12" width="8" height="6" rx="3" fill={color} />
        <rect x="21" y="12" width="8" height="6" rx="3" fill={color} />
      </g>
    );
  }
  if (style === "fade") {
    return (
      <g>
        <ellipse cx="20" cy="10" rx="7" ry="6" fill={color} />
        <rect x="13" y="4" width="14" height="4" rx="2" fill={color} opacity="0.85" />
      </g>
    );
  }
  return <ellipse cx="20" cy="10" rx="7" ry="6" fill={color} />;
}

export const AgentCharacter = memo(function AgentCharacter({
  style,
  facing = "right",
  pose = "stand",
  walking = false,
  scale = 1,
}: {
  style: AgentCharacterStyle;
  facing?: "left" | "right";
  pose?: "walk" | "sit" | "stand" | "type" | "talk";
  walking?: boolean;
  scale?: number;
}) {
  const flip = facing === "left" ? -1 : 1;
  const sitOffset = pose === "sit" ? 4 : 0;
  const armY = pose === "type" ? 24 : 22;

  return (
    <svg
      viewBox="0 0 40 48"
      width={40 * scale}
      height={48 * scale}
      className={walking ? "vo-character-walk" : ""}
      style={{ transform: `scaleX(${flip})`, overflow: "visible" }}
      aria-hidden
    >
      <ellipse cx="20" cy="45" rx="10" ry="2.5" fill="rgba(0,0,0,0.18)" />
      <g transform={`translate(0 ${sitOffset})`}>
        <rect x="14" y="30" width="5" height={pose === "sit" ? 8 : 12} rx="2" fill={style.pantsColor} />
        <rect x="21" y="30" width="5" height={pose === "sit" ? 8 : 12} rx="2" fill={style.pantsColor} />
        <rect x="12" y="20" width="16" height="12" rx="4" fill={style.shirtColor} />
        <rect x="11" y="22" width="4" height="8" rx="2" fill={style.shirtColor} />
        <rect x="25" y="22" width="4" height="8" rx="2" fill={style.shirtColor} />
        {pose === "type" && (
          <>
            <rect x="8" y={armY} width="5" height="3" rx="1.5" fill={style.skinTone} />
            <rect x="27" y={armY} width="5" height="3" rx="1.5" fill={style.skinTone} />
          </>
        )}
        <circle cx="20" cy="14" r="7" fill={style.skinTone} />
        <Hair style={style.hairStyle} color={style.hairColor} />
        <circle cx="17" cy="14" r="1" fill="#1F2937" />
        <circle cx="23" cy="14" r="1" fill="#1F2937" />
        <path d="M17 17 Q20 19 23 17" stroke="#9A6B43" strokeWidth="1" fill="none" />
        {style.accessory === "glasses" && (
          <g stroke="#334155" strokeWidth="1" fill="none">
            <circle cx="17" cy="14" r="2.5" />
            <circle cx="23" cy="14" r="2.5" />
            <path d="M19.5 14 H20.5" />
          </g>
        )}
        {style.accessory === "headset" && (
          <path d="M12 13 Q20 6 28 13" stroke="#64748B" strokeWidth="1.5" fill="none" />
        )}
        {style.accessory === "tie" && (
          <path d="M20 20 L18 28 L20 30 L22 28 Z" fill={style.accentColor} />
        )}
        {style.accessory === "badge" && (
          <circle cx="24" cy="24" r="2" fill={style.accentColor} />
        )}
      </g>
    </svg>
  );
});
