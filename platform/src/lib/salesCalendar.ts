export type SaleStatus = "Active" | "Coming Soon" | "Ended" | "Available";

export type CalendarSale = {
  slug: string;
  date: string;
  country: string;
  flag: string;
  name: string;
  location: string;
  category: string;
  auctionHouse?: string;
  totalLots?: number;
  potentialLots?: number;
  blackTypeLots?: number;
  analyzedLots?: number;
  saleDateIso?: string;
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDayMonth(part: string, year: number): Date | null {
  const match = part.trim().match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+([A-Za-z]+)$/);
  if (!match) return null;
  const day = Number(match[1]);
  const monthKey = match[3].slice(0, 3).toLowerCase();
  const month = MONTHS[monthKey];
  if (month === undefined) return null;
  return new Date(year, month, day);
}

/** Parse display dates like "7–9 Jul", "30 Jun – 2 Jul", "13 Jul". */
export function parseSaleDateRange(dateStr: string, referenceYear = new Date().getFullYear()) {
  const normalized = dateStr.replace(/\u2013/g, "–").trim();
  const crossMonth = normalized.split(/\s+–\s+/);

  if (crossMonth.length === 2) {
    const left = crossMonth[0].match(/^(\d{1,2})\s+([A-Za-z]+)$/);
    const right = crossMonth[1].match(/^(\d{1,2})\s+([A-Za-z]+)$/);
    if (left && right) {
      const startMonth = MONTHS[left[2].slice(0, 3).toLowerCase()];
      const endMonth = MONTHS[right[2].slice(0, 3).toLowerCase()];
      if (startMonth !== undefined && endMonth !== undefined) {
        let year = referenceYear;
        if (endMonth < startMonth) year += 1;
        const start = new Date(referenceYear, startMonth, Number(left[1]));
        const end = new Date(year, endMonth, Number(right[1]));
        return { start: startOfDay(start), end: startOfDay(end) };
      }
    }
  }

  const rangeMatch = normalized.match(/^(\d{1,2})[–-](\d{1,2})\s+([A-Za-z]+)$/);
  if (rangeMatch) {
    const month = MONTHS[rangeMatch[3].slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      const start = new Date(referenceYear, month, Number(rangeMatch[1]));
      const end = new Date(referenceYear, month, Number(rangeMatch[2]));
      return { start: startOfDay(start), end: startOfDay(end) };
    }
  }

  const single = parseDayMonth(normalized, referenceYear);
  if (single) {
    const day = startOfDay(single);
    return { start: day, end: day };
  }

  const fallback = new Date(referenceYear, 6, 1);
  return { start: startOfDay(fallback), end: startOfDay(fallback) };
}

export function resolveSaleStatus(
  dateStr: string,
  referenceYear = new Date().getFullYear(),
  now = new Date(),
): SaleStatus {
  const { start, end } = parseSaleDateRange(dateStr, referenceYear);
  const today = startOfDay(now);

  if (today > end) return "Ended";
  if (today >= start && today <= end) return "Active";
  return "Coming Soon";
}

export function withLiveStatus<T extends CalendarSale>(
  sales: T[],
  referenceYear = new Date().getFullYear(),
  now = new Date(),
): (T & { status: SaleStatus; startDate: Date; endDate: Date })[] {
  return sales.map((sale) => {
    const { start, end } = parseSaleDateRange(sale.date, referenceYear);
    return {
      ...sale,
      startDate: start,
      endDate: end,
      status: resolveSaleStatus(sale.date, referenceYear, now),
    };
  });
}

export function countActiveCalendarSales(sales: CalendarSale[], now = new Date()) {
  return withLiveStatus(sales, now.getFullYear(), now).filter((s) => s.status !== "Ended").length;
}

export function countSalesThisMonth(sales: CalendarSale[], now = new Date()) {
  const month = now.getMonth();
  const year = now.getFullYear();
  return withLiveStatus(sales, year, now).filter(
    (s) =>
      s.status !== "Ended" &&
      s.startDate.getMonth() === month &&
      s.startDate.getFullYear() === year,
  ).length;
}

export function getUpcomingSales<T extends CalendarSale>(sales: T[], now = new Date()) {
  return withLiveStatus(sales, now.getFullYear(), now).filter((s) => s.status !== "Ended");
}
