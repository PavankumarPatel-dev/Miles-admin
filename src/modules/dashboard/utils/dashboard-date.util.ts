import { ChartQueryDto } from '../dto/chart-query.dto';

export type DashboardPeriod = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
};

export type ChartBucket = 'day' | 'week' | 'month';

export type ChartRange = {
  startAt: Date;
  endAt: Date;
  bucket: ChartBucket;
  periods: Date[];
};

/** Builds the current and previous month boundaries in UTC for dashboard statistics. */
export function getCurrentDashboardPeriod(): DashboardPeriod {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const previousStart = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1),
  );
  const previousEnd = previousMonthDate(end);

  return { start, end, previousStart, previousEnd };
}

/** Builds the UTC date range and bucket periods for a supported dashboard chart range. */
export function getDashboardChartRange(
  range: ChartQueryDto['range'],
): ChartRange {
  const endAt = new Date();
  let startAt = new Date(endAt);
  const bucket: ChartBucket =
    range === '7d' ? 'day' : range === '1m' ? 'week' : 'month';

  if (range === '7d') {
    startAt.setUTCHours(0, 0, 0, 0);
    startAt.setUTCDate(startAt.getUTCDate() - 6);
  } else if (range === '1m') {
    startAt = subtractUtcMonths(endAt, 1);
  } else {
    const monthsBack = range === '3m' ? 2 : range === '6m' ? 5 : 11;
    startAt = new Date(
      Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth() - monthsBack, 1),
    );
  }

  return {
    startAt,
    endAt,
    bucket,
    periods: chartPeriods(startAt, endAt, bucket),
  };
}

function chartPeriods(startAt: Date, endAt: Date, bucket: ChartBucket) {
  const firstPeriod = new Date(startAt);

  if (bucket === 'day') {
    firstPeriod.setUTCHours(0, 0, 0, 0);
  } else if (bucket === 'week') {
    firstPeriod.setUTCHours(0, 0, 0, 0);
    firstPeriod.setUTCDate(
      firstPeriod.getUTCDate() - ((firstPeriod.getUTCDay() + 6) % 7),
    );
  } else {
    firstPeriod.setUTCDate(1);
    firstPeriod.setUTCHours(0, 0, 0, 0);
  }

  const periods: Date[] = [];
  const cursor = firstPeriod;
  while (cursor <= endAt) {
    periods.push(new Date(cursor));
    if (bucket === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (bucket === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    if (bucket === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return periods;
}

function previousMonthDate(date: Date) {
  const previousMonthLastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() - 1,
      Math.min(date.getUTCDate(), previousMonthLastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

function subtractUtcMonths(date: Date, months: number) {
  const monthIndex = date.getUTCMonth() - months;
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}
