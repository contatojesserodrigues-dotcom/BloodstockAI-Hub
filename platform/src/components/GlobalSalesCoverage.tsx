import inglis from "@/assets/auction-houses/inglis.webp.asset.json";
import keeneland from "@/assets/auction-houses/keeneland.png.asset.json";
import obs from "@/assets/auction-houses/obs.png.asset.json";
import tattersalls from "@/assets/auction-houses/tattersalls.jpg.asset.json";
import fasigTipton from "@/assets/auction-houses/fasig-tipton.png.asset.json";
import magicMillions from "@/assets/auction-houses/magic-millions.jpeg.asset.json";
import goffs from "@/assets/auction-houses/goffs.png.asset.json";

const houses = [
  { name: "Keeneland", src: keeneland.url, country: "USA" },
  { name: "Fasig-Tipton", src: fasigTipton.url, country: "USA" },
  { name: "OBS", src: obs.url, country: "USA" },
  { name: "Tattersalls", src: tattersalls.url, country: "UK / Ireland" },
  { name: "Goffs", src: goffs.url, country: "Ireland / UK" },
  { name: "Inglis", src: inglis.url, country: "Australia" },
  { name: "Magic Millions", src: magicMillions.url, country: "Australia" },
];

export const GlobalSalesCoverage = () => {
  return (
    <section className="bg-white py-20 md:py-28 border-y border-slate-200">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 md:mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="uppercase text-secondary font-medium tracking-[0.15em] text-[11px] md:text-xs">
              Global Sales Coverage
            </span>
          </div>
          <h2 className="font-luxury font-bold uppercase leading-[1.1] tracking-tight mb-5 text-foreground" style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.75rem)' }}>
            Independent AI-powered analysis<br className="hidden md:block" /> <span className="text-secondary">across the world's leading sales.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-body leading-relaxed">
            BloodstockAI delivers catalogue intelligence, pedigree breakdowns and market reports for every major thoroughbred auction worldwide.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 md:gap-5 max-w-6xl mx-auto">
          {houses.map((h) => (
            <div
              key={h.name}
              className="group relative bg-white border border-slate-200 rounded-xl px-4 py-6 flex flex-col items-center justify-between hover:border-[#0a2540]/40 hover:shadow-[0_8px_30px_-12px_rgba(10,37,64,0.18)] transition-all duration-300"
            >
              <div className="flex-1 w-full flex items-center justify-center h-16 md:h-20">
                <img
                  src={h.src}
                  alt={`${h.name} auction house logo`}
                  loading="lazy"
                  className="max-h-full max-w-[85%] object-contain grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 w-full text-center">
                <p className="text-xs font-semibold text-[#0a2540] tracking-wide">{h.name}</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mt-0.5">{h.country}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GlobalSalesCoverage;