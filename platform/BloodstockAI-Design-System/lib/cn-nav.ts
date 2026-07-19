import { cn } from "@/lib/utils";

/** Premium nav link — thin, modern, Apple-style */
export const navLinkClass = (active = false) =>
  cn(
    "relative text-[13px] font-normal tracking-[-0.01em] transition-colors duration-200 whitespace-nowrap",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

export const navLinkUnderline =
  "after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-secondary after:transition-all hover:after:w-full";
