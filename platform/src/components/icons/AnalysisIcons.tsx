import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Mare with foal — broodmare planning */
export function MareFoalIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Mare */}
      <path d="M8 48c2-8 6-14 12-18 3-2 7-3 11-2 4 1 7 4 9 8 1 2 2 4 2 6" />
      <path d="M30 26c2-6 6-10 12-12 4-1 8 0 11 3 3 3 4 7 3 11-1 3-3 6-6 8" />
      <path d="M44 16c3-4 7-6 12-5" />
      <circle cx="46" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <path d="M14 48h34" />
      {/* Foal */}
      <path d="M22 52c1-4 3-7 6-9 2-1 4-1 6 0 2 1 3 3 4 5" />
      <path d="M36 48c1-3 3-5 6-6 2-1 4 0 5 2" />
      <circle cx="40" cy="44" r="1" fill="currentColor" stroke="none" />
      <path d="M18 54h20" />
    </svg>
  );
}

/** Two racehorses with jockeys — training analysis */
export function RacingHorsesIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Horse 1 */}
      <path d="M6 46c3-10 9-16 17-18 4-1 8 0 11 3 2 2 3 5 3 8" />
      <path d="M28 28c2-7 7-12 14-13 5-1 10 1 13 5 2 3 3 7 2 11" />
      <path d="M48 18c2-3 5-5 9-4" />
      <circle cx="49" cy="21" r="1.25" fill="currentColor" stroke="none" />
      {/* Jockey 1 */}
      <circle cx="38" cy="22" r="2.5" />
      <path d="M38 24.5v4l-3 6" />
      <path d="M35 28h6" />
      {/* Horse 2 (behind) */}
      <path d="M4 52c2-8 7-13 14-15 3-1 6 0 9 2" opacity="0.85" />
      <path d="M20 38c2-6 6-10 12-11 4-1 8 1 10 4 1 2 2 5 1 8" opacity="0.85" />
      <path d="M36 30c2-2 4-3 7-2" opacity="0.85" />
      <circle cx="37" cy="32" r="1" fill="currentColor" stroke="none" opacity="0.85" />
      {/* Jockey 2 */}
      <circle cx="28" cy="31" r="2" opacity="0.85" />
      <path d="M28 33v3l-2 5" opacity="0.85" />
      {/* Ground / motion lines */}
      <path d="M2 54h60" />
      <path d="M50 50l4-2M54 48l3-1" opacity="0.5" />
    </svg>
  );
}
