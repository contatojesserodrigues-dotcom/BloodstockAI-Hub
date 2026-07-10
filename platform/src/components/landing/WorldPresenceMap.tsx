import { motion } from "framer-motion";

const locations = [
  { name: "UNITED STATES", x: 190, y: 202, labelX: 118, labelY: 230, anchor: "start" },
  { name: "IRELAND", x: 441, y: 147, labelX: 410, labelY: 122, anchor: "end" },
  { name: "UNITED KINGDOM", x: 460, y: 151, labelX: 477, labelY: 130, anchor: "start" },
  { name: "FRANCE", x: 468, y: 179, labelX: 484, labelY: 199, anchor: "start" },
  { name: "UAE", x: 618, y: 249, labelX: 638, labelY: 272, anchor: "start" },
  { name: "JAPAN", x: 858, y: 202, labelX: 878, labelY: 180, anchor: "start" },
  { name: "AUSTRALIA", x: 824, y: 370, labelX: 793, labelY: 415, anchor: "middle" },
  { name: "NEW ZEALAND", x: 940, y: 405, labelX: 925, labelY: 445, anchor: "end" },
];

export const WorldPresenceMap = () => (
  <div className="relative h-full min-h-[330px] overflow-hidden rounded-xl bg-[#F7F8FA]">
    <svg
      viewBox="0 0 1000 500"
      className="absolute inset-0 h-full w-full"
      aria-label="Global BloodstockAI client presence"
      role="img"
    >
      <defs>
        <filter id="map-dot-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g fill="none" stroke="#DDE1E7" strokeWidth="0.65">
        <path d="M0 125h1000M0 250h1000M0 375h1000" />
        <path d="M200 0v500M400 0v500M600 0v500M800 0v500" />
      </g>

      <g fill="#E6E8EC" stroke="#CCD1D8" strokeLinejoin="round" strokeWidth="1">
        <path d="M42 125 70 95 112 83 143 55 187 50 218 63 238 85 278 93 303 121 289 146 265 155 248 177 226 183 211 217 184 236 162 224 147 202 118 193 99 169 69 159 55 140Z" />
        <path d="m236 244 29 9 25 25 17 31-5 38-21 53-17 39-15-17-5-44-16-42 2-35-12-31Z" />
        <path d="m315 58 32-25 54 6 16 20-11 41-39 11-34-14Z" />
        <path d="m420 126 18-19 23 4 16-13 24 8 17-11 26 14 20 2 9 17-13 15-22 2-15 17-22-5-17 13-24-7-17 7-18-14-17-9Z" />
        <path d="m448 201 31-21 49 4 40 25 17 36-12 47-18 48-27 55-25-22-20-47-24-24-8-42-18-30Z" />
        <path d="m538 116 35-25 52-10 43-27 65 7 45-5 48 19 55 10 58 32 35 36-11 35-30 8-22 27-35-8-27 19-31-15-39 4-31 32-32-5-26-27-38 4-29-25-31-6-13-24-31-13-12-24Z" />
        <path d="m602 219 22 9 20 28-4 29-23-6-13-24Z" />
        <path d="m682 269 22 10 13 25-18 12-19-18Z" />
        <path d="m771 335 31-18 45 5 29 15 31 4 25 29-4 35-30 25-43 1-32 15-32-11-29-26-2-34Z" />
        <path d="m938 390 8-13 8 18-5 17-8-3Zm14 28 7-8 8 13-7 15-8-4Z" />
        <path d="m846 165 9-16 8 17-4 22-9 8-7-13Z" />
        <path d="m412 145 8-12 5 13-5 11Z" />
      </g>

      <g fill="#9AA2AE" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing="2">
        <text x="150" y="135">NORTH AMERICA</text>
        <text x="252" y="335">SOUTH AMERICA</text>
        <text x="472" y="136">EUROPE</text>
        <text x="500" y="280">AFRICA</text>
        <text x="708" y="130">ASIA</text>
        <text x="823" y="382">OCEANIA</text>
      </g>

      {locations.map((location) => (
        <g key={location.name}>
          <path
            d={`M${location.x} ${location.y} L${location.labelX} ${location.labelY - 4}`}
            fill="none"
            stroke="#C18A2B"
            strokeOpacity="0.48"
            strokeWidth="0.8"
          />
          <motion.circle
            cx={location.x}
            cy={location.y}
            r="9"
            fill="#C18A2B"
            fillOpacity="0.12"
            animate={{ r: [8, 13, 8], opacity: [0.7, 0.15, 0.7] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx={location.x} cy={location.y} r="4.2" fill="#C18A2B" stroke="#FFFFFF" strokeWidth="2" filter="url(#map-dot-glow)" />
          <text
            x={location.labelX}
            y={location.labelY}
            textAnchor={location.anchor}
            fill="#111827"
            fontFamily="Inter, sans-serif"
            fontSize="9"
            fontWeight="700"
            letterSpacing="1.1"
          >
            {location.name}
          </text>
        </g>
      ))}
    </svg>

    <div className="absolute bottom-4 left-4 rounded-lg border border-white bg-white/92 px-3 py-2 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
        Global decision intelligence
      </p>
      <p className="text-[10px] text-muted-foreground">Active professionals across 38 countries</p>
    </div>
  </div>
);
