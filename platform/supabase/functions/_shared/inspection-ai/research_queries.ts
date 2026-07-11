/** Tavily query builder — Internet Research Engine (PASSO 3). */

export type PedigreeMeta = {
  horse_name?: string;
  sire?: string;
  dam?: string;
  damsire?: string;
  dam_sire?: string;
  sex?: string;
  dob?: string;
  year_of_birth?: string;
  breeder?: string;
  vendor?: string;
  consignor?: string;
  lot_number?: string;
  lot_ref?: string;
  sale?: string;
  country?: string;
  covering_sire?: string;
  covering_year?: string;
};

export type ResearchQuery = { key: string; label: string; query: string };

export function buildPedigreeResearchQueries(meta: PedigreeMeta): ResearchQuery[] {
  const sire = (meta.sire || "").trim();
  const dam = (meta.dam || "").trim();
  const damsire = (meta.damsire || meta.dam_sire || "").trim();
  const horse = (meta.horse_name || "").trim();
  const queries: ResearchQuery[] = [];

  if (horse) {
    queries.push({
      key: "horse_racing",
      label: "horse-racing",
      query: `${horse} thoroughbred race record earnings rating wins placings injuries`,
    });
  }

  if (sire) {
    queries.push(
      { key: "sire_g1", label: "sire-g1", query: `${sire} stallion G1 winners progeny group winners` },
      { key: "sire_stats", label: "sire-stats", query: `${sire} stallion strike rate AEI average earnings stud fee sale price` },
      { key: "sire_distance", label: "sire-distance", query: `${sire} stallion best distance surface precocity progeny` },
    );
  }

  if (dam) {
    queries.push(
      { key: "dam_produce", label: "dam-produce", query: `${dam} broodmare produce record stakes winners black type earnings` },
      { key: "dam_family", label: "dam-family", query: `${dam} female family black type stakes producers siblings` },
    );
  }

  if (damsire) {
    queries.push({
      key: "damsire_influence",
      label: "damsire",
      query: `${damsire} broodmare sire influence black type nick stats`,
    });
  }

  if (sire && damsire) {
    queries.push({
      key: "nick_analysis",
      label: "nick",
      query: `${sire} x ${damsire} nick cross thoroughbred breeding success historical`,
    });
  }

  if (horse && dam) {
    queries.push({
      key: "maternal_siblings",
      label: "siblings",
      query: `${dam} progeny siblings sale price earnings wins black type ${horse} family`,
    });
  }

  queries.push({
    key: "black_type_family",
    label: "family-bt",
    query: `${horse || dam || sire} black type family G1 G2 G3 stakes winners pedigree`,
  });

  return queries;
}
