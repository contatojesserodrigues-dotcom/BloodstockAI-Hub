import { useState } from "react";
import { DashboardCommandCenter } from "@/components/dashboard/DashboardCommandCenter";
import { DashboardFreeChat } from "@/components/dashboard/DashboardFreeChat";
import { getLiveJulySales, type JulySale } from "@/data/julySales";

export function DashboardActionCatalog() {
  const [selectedSaleSlug, setSelectedSaleSlug] = useState(
    () => getLiveJulySales().find((s) => s.status !== "Ended")?.slug ?? "jrha-select-sale-yearlings",
  );

  const applySaleContext = (_sale: JulySale) => {
    setSelectedSaleSlug(_sale.slug);
  };

  return (
    <div className="space-y-6">
      <DashboardCommandCenter
        selectedSaleSlug={selectedSaleSlug}
        onSelectSale={applySaleContext}
      />
      <DashboardFreeChat />
    </div>
  );
}
