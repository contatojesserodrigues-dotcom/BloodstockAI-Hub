import type { SVGProps } from "react";

// Realistic horse head silhouette (chess-knight inspired, equestrian profile).
export const HorseHeadIcon = ({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="currentColor"
    stroke="none"
    {...props}
  >
    <path d="M21 58c0-7 1-12 3-16 1.7-3.3 4-6 6.5-8.2-2.2.4-4.4 1.2-6.4 2.5-2 1.3-3.6 3-4.6 5-.5 1-1.8 1.3-2.7.6-.8-.6-1-1.7-.5-2.6 1-1.9 1.7-3.9 2-6 .3-2.4.1-4.8-.6-7-.5-1.5-1.2-3-2-4.3-.5-.8-.3-1.8.4-2.4.8-.6 1.9-.5 2.6.2 1.2 1.3 2.6 2.4 4.1 3.3 1.5.9 3.2 1.5 4.9 1.8 0-1.6.3-3.2.9-4.7.7-1.8 1.8-3.4 3.2-4.7C33.3 13.5 36 12 39 11.4c3-.6 6.1-.2 8.9 1.1 2.8 1.3 5.1 3.5 6.6 6.2 1.5 2.7 2.2 5.8 1.9 8.9-.2 2-.7 4-1.5 5.8-.4.9-1 1.7-1.5 2.5l.6 4c.1.7-.2 1.4-.8 1.8l-3.4 2.2c-.2 4-1.7 7.9-4.3 11-2.9 3.4-6.9 5.7-11.3 6.5l-13.2.6z" />
    <circle cx="44" cy="22" r="1.6" fill="hsl(var(--background, 0 0% 100%))" />
  </svg>
);

export default HorseHeadIcon;