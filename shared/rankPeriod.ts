export type RankPeriod = "all" | "day" | "week" | "month" | "year";
export const RANK_PERIODS = [
  ["day", "日榜"],
  ["week", "周榜"],
  ["month", "月榜"],
  ["year", "年榜"],
  ["all", "总榜"],
] as const;
/** Calendar scopes in Asia/Shanghai; weeks start on Monday, not rolling7days. */
export function rankingWindow(period: RankPeriod, now = Date.now()) {
  const offset = 8 * 60 * 60 * 1000,
    d = new Date(now + offset),
    y = d.getUTCFullYear(),
    m = d.getUTCMonth(),
    day = d.getUTCDate();
  let start = -Infinity,
    end = Infinity;
  if (period === "day") {
    start = Date.UTC(y, m, day);
    end = Date.UTC(y, m, day + 1);
  }
  if (period === "week") {
    const monday = day - ((d.getUTCDay() + 6) % 7);
    start = Date.UTC(y, m, monday);
    end = Date.UTC(y, m, monday + 7);
  }
  if (period === "month") {
    start = Date.UTC(y, m, 1);
    end = Date.UTC(y, m + 1, 1);
  }
  if (period === "year") {
    start = Date.UTC(y, 0, 1);
    end = Date.UTC(y + 1, 0, 1);
  }
  return {
    start: start - offset,
    end: end - offset,
    timezone: "Asia/Shanghai",
    label: RANK_PERIODS.find((p) => p[0] === period)?.[1] || "总榜",
  };
}
export function rankPeriod(value: unknown): RankPeriod {
  return ["day", "week", "month", "year"].includes(String(value))
    ? (value as RankPeriod)
    : "all";
}
