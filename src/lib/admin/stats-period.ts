export const STATS_PERIODS = ["today", "week", "month", "year"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

export function parseStatsPeriod(value: unknown): StatsPeriod {
  if (
    typeof value === "string" &&
    (STATS_PERIODS as readonly string[]).includes(value)
  ) {
    return value as StatsPeriod;
  }
  return "week";
}

export function periodRange(period: StatsPeriod): {
  from: Date;
  to: Date;
  /** Mongo dateToString format for timeline buckets */
  bucketFormat: string;
  timelineLabel: string;
  bookingsLabel: string;
} {
  const to = new Date();
  const from = new Date(to);

  switch (period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      return {
        from,
        to,
        bucketFormat: "%Y-%m-%d",
        timelineLabel: "New bookings created today",
        bookingsLabel: "Bookings today",
      };
    case "month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      return {
        from,
        to,
        bucketFormat: "%Y-%m-%d",
        timelineLabel: "New bookings created this month",
        bookingsLabel: "Bookings this month",
      };
    case "year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      return {
        from,
        to,
        bucketFormat: "%Y-%m",
        timelineLabel: "New bookings created this year",
        bookingsLabel: "Bookings this year",
      };
    case "week":
    default:
      from.setTime(to.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        from,
        to,
        bucketFormat: "%Y-%m-%d",
        timelineLabel: "New bookings created over the last 7 days",
        bookingsLabel: "Bookings this week",
      };
  }
}
