// Week always Mon–Sun. Identified by week_start (YYYY-MM-DD).

export type WeekRange = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
};

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtFull(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getWeekRange(weeksAgo = 0): WeekRange {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: fmt(monday),
    weekEnd: fmt(sunday),
    weekLabel: `${fmtShort(monday)} – ${fmtFull(sunday)}`,
  };
}

export function getRecentWeeks(count = 12): WeekRange[] {
  return Array.from({ length: count }, (_, i) => getWeekRange(i));
}

export function weekLabelFromStart(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  const sunday = new Date(d);
  sunday.setDate(d.getDate() + 6);
  return `${fmtShort(d)} – ${fmtFull(sunday)}`;
}
