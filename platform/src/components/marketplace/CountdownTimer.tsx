import { useEffect, useState } from "react";

function diffParts(target: number) {
  const now = Date.now();
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return { d, h, m, s, expired: target <= now };
}

export const CountdownTimer = ({ targetIso, className }: { targetIso: string | null; className?: string }) => {
  const target = targetIso ? new Date(targetIso).getTime() : 0;
  const [parts, setParts] = useState(() => diffParts(target));

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setParts(diffParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!targetIso) return <span className={className}>—</span>;
  if (parts.expired) return <span className={className}>Closed</span>;
  return (
    <span className={className}>
      {parts.d}d {parts.h}h {parts.m}m {parts.s.toString().padStart(2, "0")}s
    </span>
  );
};

export default CountdownTimer;