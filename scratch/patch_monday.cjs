const fs = require('fs');

let content = fs.readFileSync('src/components/monday/MondayModePage.tsx', 'utf-8');

// Add fmtMetricCell, fmt, fmtPct to imports if not there
if (!content.includes('fmtMetricCell')) {
  content = content.replace(
    'import { fmt } from "@/utils/format"',
    'import { fmt, fmtMetricCell, fmtPct } from "@/utils/format"'
  );
  if (!content.includes('fmtMetricCell')) {
    content = content.replace(
      'import { formatPct } from "@/utils/metricCalculations"',
      'import { formatPct } from "@/utils/metricCalculations"\nimport { fmt, fmtMetricCell, fmtPct } from "@/utils/format"'
    );
  }
}

// Replace Content Rows array
content = content.replace(
  /const MONDAY_CONTENT_METRICS[\s\S]*?(?=const MONDAY_LEADGEN_ROWS)/,
  `const CONTENT_ROWS = [
  { id: 'C03', label: 'Posts Drafted',        category: 'content_metrics' },
  { id: 'C09', label: 'Posts Posted',          category: 'content_metrics' },
  { id: 'C10', label: 'Impressions',           category: 'content_metrics' },
  { id: 'C_IMP_POST', label: 'Impr. / Post',  category: 'content_metrics', calc: true },
  { id: 'C15', label: 'New Followers',         category: 'content_metrics' },
  { id: 'C14', label: 'Profile Views',         category: 'content_metrics' },
  { id: 'C18', label: 'Comment Replies Done',  category: 'content_metrics' },
  { id: 'C13', label: 'Engagement Total',      category: 'content_metrics' },
  { id: 'C20', label: 'EOM Sent',             category: 'content_metrics' },
  { id: 'C25', label: 'Blockers',             category: 'content_metrics' },
]

`
);

// Replace Leadgen Rows array
content = content.replace(
  /const MONDAY_LEADGEN_ROWS[\s\S]*?(?=export function MondayModePage)/,
  `const LEADGEN_ROWS = [
  { id: 'L07',      label: 'ICP Targeted',       category: 'leadgen_metrics' },
  { id: 'L10',      label: 'Conn Notes Sent',     category: 'leadgen_metrics' },
  { id: 'L11',      label: 'Accepted',            category: 'leadgen_metrics' },
  { id: 'L12_calc', label: 'Acceptance Rate',     category: 'leadgen_metrics', calc: true },
  { id: 'L13',      label: 'Responded',           category: 'leadgen_metrics' },
  { id: 'L14_calc', label: 'Response Rate',       category: 'leadgen_metrics', calc: true },
  { id: 'L15',      label: 'Positive Responses',  category: 'leadgen_metrics' },
  { id: 'L17_calc', label: 'Positive Rate',       category: 'leadgen_metrics', calc: true },
  { id: 'L16',      label: 'Negative Responses',  category: 'leadgen_metrics' },
  { id: 'L24',      label: 'Meetings Booked',     category: 'leadgen_metrics' },
]

const EXISTING_CONN_ROWS = [
  { id: 'L19', label: 'Existing Conn Sent',     category: 'leadgen_metrics' },
  { id: 'L20', label: 'Existing Conn Replied',  category: 'leadgen_metrics' },
  { id: 'L21_calc', label: 'Response Rate',     category: 'leadgen_metrics', calc: true },
]

function resolveCell(row: any, metricId: string, weekRow: any): string {
  if (!weekRow) return '—'
  const cm = weekRow.content_metrics ?? {}
  const lm = weekRow.leadgen_metrics ?? {}

  // Calculated fields
  if (metricId === 'C_IMP_POST') {
    const imp = Number(cm?.C10?.value ?? 0)
    const posts = Number(cm?.C09?.value ?? 0)
    return posts > 0 ? Math.round(imp / posts).toString() : '—'
  }
  if (metricId === 'L12_calc') return fmtPct(lm?.L11?.value, lm?.L10?.value)
  if (metricId === 'L14_calc') return fmtPct(lm?.L13?.value, lm?.L11?.value)
  if (metricId === 'L17_calc') return fmtPct(lm?.L15?.value, lm?.L13?.value)
  if (metricId === 'L21_calc') return fmtPct(lm?.L20?.value, lm?.L19?.value)

  // Standard fields
  const category = metricId.startsWith('C') ? 'content_metrics' : 'leadgen_metrics'
  return fmtMetricCell(weekRow, metricId, category as 'content_metrics' | 'leadgen_metrics')
}

`
);

fs.writeFileSync('src/components/monday/MondayModePage.tsx', content);
