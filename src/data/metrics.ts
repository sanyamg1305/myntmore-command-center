export type MetricType = 'number' | 'percentage' | 'textarea' | 'boolean' | 'slider' | 'auto'

export interface Metric {
  id: string           // e.g. 'C01', 'L10'
  name: string         // display name
  type: MetricType
  category: 'content' | 'leadgen'
  group: string        // section heading e.g. 'Production Pipeline'
  autoFormula?: string // e.g. 'C06+C07+C08' — resolved at render time
  dependsOn?: string[] // metric IDs needed for auto-calc
  hasTarget: boolean   // whether this metric has a target field
  hasNote: boolean     // whether this metric has an inline note field
  unit?: string        // '%' | '₹' | 'hrs' etc
}

export const CONTENT_METRICS: Metric[] = [
  // Production Pipeline
  { id: 'C01', name: 'LinkedIn Post Ideation', type: 'number', category: 'content', group: 'Production Pipeline', hasTarget: true, hasNote: false },
  { id: 'C03', name: 'LinkedIn Post Drafting', type: 'number', category: 'content', group: 'Production Pipeline', hasTarget: true, hasNote: false },
  { id: 'C04', name: 'Posts Approved by Client', type: 'number', category: 'content', group: 'Production Pipeline', hasTarget: true, hasNote: false },
  { id: 'C05', name: 'What Content Went Out', type: 'textarea', category: 'content', group: 'Production Pipeline', hasTarget: false, hasNote: false },
  // Post Output
  { id: 'C06', name: 'Text + Image Posts Posted', type: 'number', category: 'content', group: 'Post Output', hasTarget: true, hasNote: false },
  { id: 'C07', name: 'Carousels Posted', type: 'number', category: 'content', group: 'Post Output', hasTarget: true, hasNote: false },
  { id: 'C08', name: 'Videos Posted', type: 'number', category: 'content', group: 'Post Output', hasTarget: true, hasNote: false },
  { id: 'C09', name: 'Total Posts Posted', type: 'auto', category: 'content', group: 'Post Output', autoFormula: 'C06+C07+C08', dependsOn: ['C06','C07','C08'], hasTarget: true, hasNote: false },
  // Performance
  { id: 'C10', name: 'Impressions', type: 'number', category: 'content', group: 'Performance', hasTarget: true, hasNote: false },
  { id: 'C11', name: 'Likes', type: 'number', category: 'content', group: 'Performance', hasTarget: false, hasNote: false },
  { id: 'C12', name: 'Comments', type: 'number', category: 'content', group: 'Performance', hasTarget: false, hasNote: false },
  { id: 'C13', name: 'Engagement Total', type: 'number', category: 'content', group: 'Performance', hasTarget: true, hasNote: false },
  { id: 'C14', name: 'Profile Viewers', type: 'number', category: 'content', group: 'Performance', hasTarget: false, hasNote: false },
  { id: 'C15', name: 'New Followers', type: 'number', category: 'content', group: 'Performance', hasTarget: true, hasNote: false },
  { id: 'C16', name: 'Total Follower Count', type: 'number', category: 'content', group: 'Performance', hasTarget: false, hasNote: false },
  // Engagement Activity
  { id: 'C17', name: 'Engagement on Other Profiles', type: 'number', category: 'content', group: 'Engagement Activity', hasTarget: true, hasNote: false },
  { id: 'C18', name: 'Comment Replies Done', type: 'boolean', category: 'content', group: 'Engagement Activity', hasTarget: false, hasNote: true },
  // Delivery & Reporting
  { id: 'C19', name: 'Client Meeting Held', type: 'boolean', category: 'content', group: 'Delivery & Reporting', hasTarget: false, hasNote: false },
  { id: 'C20', name: 'EOM Report Sent', type: 'boolean', category: 'content', group: 'Delivery & Reporting', hasTarget: false, hasNote: false },
  { id: 'C21', name: 'Monthly Podcast Delivered', type: 'boolean', category: 'content', group: 'Delivery & Reporting', hasTarget: false, hasNote: false },
  { id: 'C22', name: 'Quarterly Client Feedback', type: 'boolean', category: 'content', group: 'Delivery & Reporting', hasTarget: false, hasNote: false },
  { id: 'C23', name: 'Aha Moments / Update Shared', type: 'boolean', category: 'content', group: 'Delivery & Reporting', hasTarget: false, hasNote: false },
  // Qualitative
  { id: 'C24', name: "What's Working (Content)", type: 'textarea', category: 'content', group: 'Qualitative', hasTarget: false, hasNote: false },
  { id: 'C25', name: "What's Not Working (Content)", type: 'textarea', category: 'content', group: 'Qualitative', hasTarget: false, hasNote: false },
]

export const LEADGEN_METRICS: Metric[] = [
  // InMail Outreach
  { id: 'L01', name: 'InMail ICP Targeted', type: 'textarea', category: 'leadgen', group: 'InMail Outreach', hasTarget: false, hasNote: false },
  { id: 'L02', name: 'InMails Sent', type: 'number', category: 'leadgen', group: 'InMail Outreach', hasTarget: true, hasNote: false },
  { id: 'L03', name: 'InMails Accepted', type: 'number', category: 'leadgen', group: 'InMail Outreach', hasTarget: false, hasNote: false },
  { id: 'L04', name: 'InMails Declined', type: 'number', category: 'leadgen', group: 'InMail Outreach', hasTarget: false, hasNote: false },
  { id: 'L05', name: 'InMail Acceptance Rate', type: 'auto', category: 'leadgen', group: 'InMail Outreach', autoFormula: 'L03/L02*100', dependsOn: ['L03','L02'], hasTarget: false, hasNote: false, unit: '%' },
  { id: 'L06', name: 'InMail Hot Leads', type: 'number', category: 'leadgen', group: 'InMail Outreach', hasTarget: false, hasNote: false },
  // Connection Request Outreach
  { id: 'L07', name: 'ICP Targeted', type: 'textarea', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: false, hasNote: false },
  { id: 'L08', name: 'Message Narrative / Strategy', type: 'textarea', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: false, hasNote: false },
  { id: 'L09', name: 'Target Set by Outreach Owner', type: 'number', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: false, hasNote: false },
  { id: 'L10', name: 'Connection Requests Sent', type: 'number', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: true, hasNote: false },
  { id: 'L11', name: 'Accepted Invitations', type: 'number', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: false, hasNote: false },
  { id: 'L12', name: 'Acceptance Rate', type: 'auto', category: 'leadgen', group: 'Connection Request Outreach', autoFormula: 'L11/L10*100', dependsOn: ['L11','L10'], hasTarget: true, hasNote: false, unit: '%' },
  { id: 'L13', name: 'Answered Messages', type: 'number', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: false, hasNote: false },
  { id: 'L14', name: 'Response Rate', type: 'auto', category: 'leadgen', group: 'Connection Request Outreach', autoFormula: 'L13/L11*100', dependsOn: ['L13','L11'], hasTarget: true, hasNote: false, unit: '%' },
  { id: 'L15', name: 'Positive Replies', type: 'number', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: false, hasNote: false },
  { id: 'L16', name: 'Negative Replies', type: 'number', category: 'leadgen', group: 'Connection Request Outreach', hasTarget: false, hasNote: false },
  { id: 'L17', name: 'Positive Response Rate', type: 'auto', category: 'leadgen', group: 'Connection Request Outreach', autoFormula: 'L15/L13*100', dependsOn: ['L15','L13'], hasTarget: false, hasNote: false, unit: '%' },
  { id: 'L18', name: 'Negative Response Rate', type: 'auto', category: 'leadgen', group: 'Connection Request Outreach', autoFormula: 'L16/L13*100', dependsOn: ['L16','L13'], hasTarget: false, hasNote: false, unit: '%' },
  // Existing Connections
  { id: 'L19', name: 'Existing Connections Msgs Sent', type: 'number', category: 'leadgen', group: 'Existing Connections', hasTarget: false, hasNote: false },
  { id: 'L20', name: 'Existing Connections Answered', type: 'number', category: 'leadgen', group: 'Existing Connections', hasTarget: false, hasNote: false },
  { id: 'L21', name: 'Existing Connections Rate', type: 'auto', category: 'leadgen', group: 'Existing Connections', autoFormula: 'L20/L19*100', dependsOn: ['L20','L19'], hasTarget: false, hasNote: false, unit: '%' },
  { id: 'L22', name: 'Existing Connections Hot Leads', type: 'number', category: 'leadgen', group: 'Existing Connections', hasTarget: false, hasNote: false },
  // Pipeline & Conversion
  { id: 'L24', name: 'Meetings Booked', type: 'number', category: 'leadgen', group: 'Pipeline & Conversion', hasTarget: true, hasNote: false },
  { id: 'L25', name: 'Meetings Attended', type: 'number', category: 'leadgen', group: 'Pipeline & Conversion', hasTarget: false, hasNote: false },
  { id: 'L26', name: 'Meeting Show Up Rate', type: 'auto', category: 'leadgen', group: 'Pipeline & Conversion', autoFormula: 'L25/L24*100', dependsOn: ['L25','L24'], hasTarget: false, hasNote: false, unit: '%' },
  { id: 'L27', name: 'Leads Generated', type: 'number', category: 'leadgen', group: 'Pipeline & Conversion', hasTarget: true, hasNote: false },
  // Qualitative
  { id: 'L28', name: "What's Working (Lead Gen)", type: 'textarea', category: 'leadgen', group: 'Qualitative', hasTarget: false, hasNote: false },
  { id: 'L29', name: "What's Not Working / Blockers", type: 'textarea', category: 'leadgen', group: 'Qualitative', hasTarget: false, hasNote: false },
  { id: 'L30', name: 'Happiness Index', type: 'slider', category: 'leadgen', group: 'Qualitative', hasTarget: false, hasNote: false },
]

export const ALL_METRICS = [...CONTENT_METRICS, ...LEADGEN_METRICS]

export function resolveAutoCalc(metricId: string, values: Record<string, number>): number {
  const metric = ALL_METRICS.find(m => m.id === metricId)
  if (!metric?.autoFormula) return 0
  try {
    const formula = metric.autoFormula.replace(/[A-Z][0-9]+/g, (id) => String(values[id] ?? 0))
    const result = Function(`"use strict"; return (${formula})`)()
    return isFinite(result) ? Math.round(result * 100) / 100 : 0
  } catch { return 0 }
}
