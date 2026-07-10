import { FileText, Video, GitMerge, Clock, BarChart2, Target, Clipboard, Play } from "lucide-react";

export const WhatWeDo = () => {
  const leftItems = [
  { icon: Clipboard, text: "Reviewing catalogue PDFs manually across hundreds of lots" },
  { icon: Play, text: "Watching breeze-up footage repeatedly without structured benchmarks" },
  { icon: GitMerge, text: "Cross-referencing pedigree data across Weatherbys, Equineline, and Blood-Horse" },
  { icon: Clock, text: "Limited time to evaluate every lot before the session opens" },
  { icon: BarChart2, text: "Valuation based on experience and partial data" }];


  const rightItems = [
  { icon: FileText, text: "Full catalogue uploaded and analysed — every lot evaluated against the same criteria" },
  { icon: Video, text: "Biomechanical report generated from video, with structured conformational assessment" },
  { icon: GitMerge, text: "Pedigree, dam-line, and comparable sales consolidated in one report" },
  { icon: Target, text: "Shortlist ready before the session opens" },
  { icon: BarChart2, text: "Valuation informed by global auction data and performance records" }];


  return (
    <section className="bg-background relative overflow-hidden" style={{ paddingTop: 'clamp(40px, 6vw, 72px)', paddingBottom: 'clamp(40px, 6vw, 72px)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />

      























































      
    </section>);

};