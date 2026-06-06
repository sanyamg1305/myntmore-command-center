// All metric definitions for client (content + leadgen), TJ personal brand, and sales.

export type MetricType =
  | "number"
  | "textarea"
  | "boolean"
  | "auto"
  | "slider";

export type Metric = {
  id: string;
  name: string;
  type: MetricType;
  section: string;
  formula?: string; // for auto fields, human-readable description
  compute?: (vals: Record<string, number>) => number;
};

const num = (id: string, name: string, section: string): Metric => ({
  id,
  name,
  type: "number",
  section,
});
const text = (id: string, name: string, section: string): Metric => ({
  id,
  name,
  type: "textarea",
  section,
});
const bool = (id: string, name: string, section: string): Metric => ({
  id,
  name,
  type: "boolean",
  section,
});
const auto = (
  id: string,
  name: string,
  section: string,
  formula: string,
  compute: (v: Record<string, number>) => number,
): Metric => ({ id, name, type: "auto", section, formula, compute });

const pct = (a: string, b: string) => (v: Record<string, number>) =>
  v[b] ? (v[a] / v[b]) * 100 : 0;

export const CONTENT_METRICS: Metric[] = [
  num("C01", "LinkedIn Post Ideation", "Production Pipeline"),
  num("C02", "Target Set by Content Owner", "Production Pipeline"),
  num("C03", "LinkedIn Post Drafting", "Production Pipeline"),
  num("C04", "Posts Approved by Client", "Production Pipeline"),
  text("C05", "What Content Went Out", "Production Pipeline"),
  num("C06", "Text + Image Posts Posted", "Post Output"),
  num("C07", "Carousels Posted", "Post Output"),
  num("C08", "Videos Posted", "Post Output"),
  auto("C09", "Total Posts Posted", "Post Output", "C06 + C07 + C08", (v) =>
    (v.C06 || 0) + (v.C07 || 0) + (v.C08 || 0),
  ),
  num("C10", "Impressions", "Performance"),
  num("C11", "Likes", "Performance"),
  num("C12", "Comments", "Performance"),
  auto("C13", "Engagement Total", "Performance", "C11 + C12", (v) =>
    (v.C11 || 0) + (v.C12 || 0),
  ),
  num("C14", "Profile Viewers (bi-monthly)", "Performance"),
  num("C15", "New Followers", "Performance"),
  num("C16", "Total Follower Count", "Performance"),
  num("C17", "Engagement on Other Profiles", "Engagement Activity"),
  bool("C18", "Comment Replies Done", "Engagement Activity"),
  bool("C19", "Client Meeting Held", "Delivery & Reporting"),
  bool("C20", "EOM Report Sent", "Delivery & Reporting"),
  bool("C21", "Monthly Podcast Delivered", "Delivery & Reporting"),
  bool("C22", "Quarterly Client Feedback", "Delivery & Reporting"),
  bool("C23", "Aha Moments / Update Shared", "Delivery & Reporting"),
  text("C24", "What's Working (Content)", "Qualitative"),
  text("C25", "What's Not Working (Content)", "Qualitative"),
];

export const LEADGEN_METRICS: Metric[] = [
  text("L01", "InMail ICP Targeted", "InMail Outreach"),
  num("L02", "InMails Sent", "InMail Outreach"),
  num("L03", "InMails Accepted", "InMail Outreach"),
  num("L04", "InMails Declined", "InMail Outreach"),
  auto("L05", "InMail Acceptance Rate", "InMail Outreach", "L03 / L02 × 100", pct("L03", "L02")),
  num("L06", "InMail Hot Leads", "InMail Outreach"),
  text("L07", "ICP Targeted", "Connection Requests"),
  text("L08", "Message Narrative / Strategy", "Connection Requests"),
  num("L09", "Target Set by Outreach Owner", "Connection Requests"),
  num("L10", "Connection Requests Sent", "Connection Requests"),
  num("L11", "Accepted Invitations", "Connection Requests"),
  auto("L12", "Acceptance Rate", "Connection Requests", "L11 / L10 × 100", pct("L11", "L10")),
  num("L13", "Answered Messages", "Connection Requests"),
  auto("L14", "Response Rate", "Connection Requests", "L13 / L11 × 100", pct("L13", "L11")),
  num("L15", "Positive Replies", "Connection Requests"),
  num("L16", "Negative Replies", "Connection Requests"),
  auto("L17", "Positive Response Rate", "Connection Requests", "L15 / L13 × 100", pct("L15", "L13")),
  auto("L18", "Negative Response Rate", "Connection Requests", "L16 / L13 × 100", pct("L16", "L13")),
  num("L19", "Existing Connections Msgs Sent", "Existing Connections"),
  num("L20", "Existing Connections Answered", "Existing Connections"),
  auto("L21", "Existing Connections Rate", "Existing Connections", "L20 / L19 × 100", pct("L20", "L19")),
  num("L22", "Existing Connections Hot Leads", "Existing Connections"),
  num("L24", "Meetings Booked", "Pipeline & Conversion"),
  num("L25", "Meetings Attended", "Pipeline & Conversion"),
  auto("L26", "Meeting Show Up Rate", "Pipeline & Conversion", "L25 / L24 × 100", pct("L25", "L24")),
  num("L27", "Leads Generated", "Pipeline & Conversion"),
  text("L28", "What's Working (Lead Gen)", "Qualitative"),
  text("L29", "What's Not Working / Blockers", "Qualitative"),
  { id: "L30", name: "Happiness Index (0–10)", type: "slider", section: "Qualitative" },
];

export type StatusKey = "over" | "on" | "risk" | "off" | "none";

export function statusFromAchievement(
  actual: number | null | undefined,
  target: number | null | undefined,
  manualOverride?: StatusKey,
): StatusKey {
  if (manualOverride) return manualOverride;
  if (target == null || target === 0 || actual == null) return "none";
  const pct = (actual / target) * 100;
  if (pct > 100) return "over";
  if (pct >= 70) return "on";
  if (pct >= 40) return "risk";
  return "off";
}

export const STATUS_LABEL: Record<StatusKey, string> = {
  over: "Overperforming",
  on: "On Track",
  risk: "At Risk",
  off: "Off Track",
  none: "No Target",
};
