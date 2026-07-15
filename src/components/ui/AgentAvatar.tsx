import { memo } from "react";

export const AgentAvatar = memo(function AgentAvatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" };
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-medium text-white ${sizes[size]}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
});
