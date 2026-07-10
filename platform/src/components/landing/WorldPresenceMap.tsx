import globalMap from "@/assets/global-decision-intelligence-map.png";

export const WorldPresenceMap = () => (
  <div className="relative h-full min-h-[330px] overflow-hidden rounded-xl bg-white">
    <img
      src={globalMap}
      alt="Global decision intelligence coverage map"
      className="h-full w-full object-contain object-center"
      draggable={false}
      loading="lazy"
    />
  </div>
);
