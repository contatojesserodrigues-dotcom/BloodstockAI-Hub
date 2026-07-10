import { defineMcp } from "@lovable.dev/mcp-js";
import listHorsesForSale from "./tools/list-horses-for-sale";
import listSalesCatalogues from "./tools/list-sales-catalogues";
import searchCatalogueLots from "./tools/search-catalogue-lots";

export default defineMcp({
  name: "bloodstockai-mcp",
  title: "BloodstockAI",
  version: "0.1.0",
  instructions:
    "Tools for the BloodstockAI thoroughbred bloodstock platform. Use `list_horses_for_sale` for the private-sale marketplace, `list_sales_catalogues` to browse indexed auction sales (Tattersalls, Goffs, Arqana, Keeneland, etc.), and `search_catalogue_lots` to look up specific lots by horse, sire, or dam.",
  tools: [listHorsesForSale, listSalesCatalogues, searchCatalogueLots],
});