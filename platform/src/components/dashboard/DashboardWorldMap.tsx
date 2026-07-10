import { motion } from "framer-motion";

const locations = [
  { name: "UNITED STATES", x: 178, y: 198, labelX: 108, labelY: 228 },
  { name: "IRELAND", x: 438, y: 142, labelX: 402, labelY: 118 },
  { name: "UNITED KINGDOM", x: 456, y: 148, labelX: 478, labelY: 128 },
  { name: "FRANCE", x: 466, y: 176, labelX: 486, labelY: 198 },
  { name: "UAE", x: 612, y: 244, labelX: 636, labelY: 268 },
  { name: "JAPAN", x: 852, y: 198, labelX: 874, labelY: 176 },
  { name: "AUSTRALIA", x: 818, y: 366, labelX: 786, labelY: 412 },
  { name: "NEW ZEALAND", x: 934, y: 402, labelX: 918, labelY: 442 },
];

export function DashboardWorldMap() {
  return (
    <div className="relative h-full min-h-[340px] lg:min-h-[420px] overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-[#EEF2F7] via-[#F8FAFC] to-[#E8EDF4]">
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 h-full w-full"
        aria-label="Global auction coverage map"
        role="img"
      >
        <defs>
          <filter id="dash-map-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="500" fill="url(#oceanGrad)" />

        <g fill="none" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.6">
          <path d="M0 125h1000M0 250h1000M0 375h1000" />
          <path d="M125 0v500M250 0v500M375 0v500M500 0v500M625 0v500M750 0v500M875 0v500" />
        </g>

        <g fill="#D1D9E3" stroke="#B8C4D4" strokeLinejoin="round" strokeWidth="0.8">
          <path d="M38 118 68 88 108 76 140 48 182 42 214 56 236 78 276 86 300 114 286 140 262 150 244 172 222 178 206 212 178 232 156 220 142 198 112 188 94 164 64 154 50 134Z" />
          <path d="M232 238 260 248 284 272 298 304 292 342 276 378 258 412 242 396 236 352 222 310 228 268Z" />
          <path d="M308 52 340 28 392 34 408 54 398 96 360 108 324 96Z" />
          <path d="M414 118 432 98 456 102 472 88 496 96 514 84 542 98 562 100 570 118 556 134 534 136 518 152 496 146 478 160 452 152 434 164 416 150Z" />
          <path d="M442 194 472 174 520 178 558 202 574 238 562 286 544 334 518 382 492 360 474 318 458 286 446 252 438 220Z" />
          <path d="M532 108 568 82 618 72 660 44 724 52 768 46 816 64 862 74 908 96 944 118 968 148 952 182 928 192 906 218 878 226 852 244 824 232 798 248 772 236 748 254 722 242 698 258 672 244 648 262 622 248 598 264 572 248 548 262 524 248 502 262 478 248 454 262 430 248 406 262 382 248 358 262 334 248 310 262 286 248 262 262 238 248 214 262 190 248 166 262 142 248 118 262 94 248 70 262 46 248 22 262 0 248V108Z" opacity="0.95" />
          <path d="M596 212 618 222 636 252 628 282 604 276 588 244Z" />
          <path d="M676 262 698 272 712 298 694 312 676 294Z" />
          <path d="M764 328 796 310 838 316 866 332 894 336 918 364 912 402 882 428 838 432 804 448 772 436 744 410 738 372Z" />
          <path d="M928 384 938 368 948 386 942 408 932 402Z" />
          <path d="M844 158 854 142 864 162 858 184 848 178Z" />
        </g>

        {locations.map((location) => (
          <g key={location.name}>
            <path
              d={`M${location.x} ${location.y} L${location.labelX} ${location.labelY - 6}`}
              fill="none"
              stroke="#C58A2B"
              strokeOpacity="0.55"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <motion.circle
              cx={location.x}
              cy={location.y}
              r="18"
              fill="#C58A2B"
              fillOpacity="0.14"
              animate={{ r: [14, 24, 14], opacity: [0.55, 0.12, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              cx={location.x}
              cy={location.y}
              r="10"
              fill="#C58A2B"
              fillOpacity="0.28"
              animate={{ r: [8, 14, 8], opacity: [0.7, 0.2, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            />
            <circle
              cx={location.x}
              cy={location.y}
              r="6.5"
              fill="#C58A2B"
              stroke="#FFFFFF"
              strokeWidth="3"
              filter="url(#dash-map-glow)"
            />
            <circle cx={location.x} cy={location.y} r="2.5" fill="#FFF7E6" />
            <rect
              x={location.labelX - (location.name.length * 3.2)}
              y={location.labelY - 14}
              width={location.name.length * 6.4 + 12}
              height="18"
              rx="4"
              fill="rgba(255,255,255,0.92)"
              stroke="rgba(197,138,43,0.25)"
            />
            <text
              x={location.labelX}
              y={location.labelY}
              textAnchor="middle"
              fill="#0F172A"
              fontFamily="Inter, sans-serif"
              fontSize="9"
              fontWeight="700"
              letterSpacing="0.8"
            >
              {location.name}
            </text>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-4 left-4 rounded-xl border border-white/80 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">
          Global decision intelligence
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Active professionals across 38 countries</p>
      </div>
    </div>
  );
}
