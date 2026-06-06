const fs = require('fs');

let content = fs.readFileSync('src/components/monday/MondayModePage.tsx', 'utf-8');

// Add readVal, readNum to format imports
if (!content.includes('readVal') && content.includes('fmtMetricCell')) {
  content = content.replace(
    'import { fmt, fmtMetricCell, fmtPct } from "@/utils/format"',
    'import { fmt, fmtMetricCell, fmtPct, readVal, readNum } from "@/utils/format"'
  );
}

// 1. Patch resolveCell function
const targetResolveCell = `function resolveCell(row: any, metricId: string, weekRow: any): string {
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
}`;

const replacementResolveCell = `function resolveCell(row: any, metricId: string, weekRow: any): string {
  if (!weekRow) return '—'
  const cm = weekRow.content_metrics ?? {}
  const lm = weekRow.leadgen_metrics ?? {}

  // Calculated fields
  if (metricId === 'C_IMP_POST') {
    const imp = readNum(cm, 'C10') ?? 0
    const posts = readNum(cm, 'C09') ?? 0
    return posts > 0 ? Math.round(imp / posts).toString() : '—'
  }
  if (metricId === 'L12_calc') return fmtPct(readNum(lm, 'L11'), readNum(lm, 'L10'))
  if (metricId === 'L14_calc') return fmtPct(readNum(lm, 'L13'), readNum(lm, 'L11'))
  if (metricId === 'L17_calc') return fmtPct(readNum(lm, 'L15'), readNum(lm, 'L13'))
  if (metricId === 'L21_calc') return fmtPct(readNum(lm, 'L20'), readNum(lm, 'L19'))

  // Standard fields
  const category = metricId.startsWith('C') ? 'content_metrics' : 'leadgen_metrics'
  return fmtMetricCell(weekRow, metricId, category as 'content_metrics' | 'leadgen_metrics')
}`;

// 2. Patch renderMetricTable parser
const targetMetricTable = `            {metrics.map(m => {
              const val = parseFloat(current?.[m.id]?.value) || 0
              const pVal = parseFloat(prev?.[m.id]?.value) || 0`;

const replacementMetricTable = `            {metrics.map(m => {
              const val = readNum(current, m.id) ?? 0
              const pVal = readNum(prev, m.id) ?? 0`;

// 3. Patch step 3 chartData parser
const targetStep3Chart = `      const chartData = tjHistory.map(h => ({
        week: h.week_label?.split(' - ')[0],
        followers: parseFloat(h.instagram?.TJI11?.value) || 0,
        views: parseFloat(h.youtube?.TJY02?.value) || 0
      }))`;

const replacementStep3Chart = `      const chartData = tjHistory.map(h => ({
        week: h.week_label?.split(' - ')[0],
        followers: readNum(h.instagram, 'TJI11') ?? 0,
        views: readNum(h.youtube, 'TJY02') ?? 0
      }))`;

// Normalise line endings
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTargetResolveCell = targetResolveCell.replace(/\r\n/g, '\n');
const normalizedReplacementResolveCell = replacementResolveCell.replace(/\r\n/g, '\n');
const normalizedTargetMetricTable = targetMetricTable.replace(/\r\n/g, '\n');
const normalizedReplacementMetricTable = replacementMetricTable.replace(/\r\n/g, '\n');
const normalizedTargetStep3Chart = targetStep3Chart.replace(/\r\n/g, '\n');
const normalizedReplacementStep3Chart = replacementStep3Chart.replace(/\r\n/g, '\n');

let patched = normalizedContent;

if (patched.includes(normalizedTargetResolveCell)) {
  patched = patched.replace(normalizedTargetResolveCell, normalizedReplacementResolveCell);
  console.log("resolveCell patched successfully!");
} else {
  console.log("Could not find resolveCell target");
}

if (patched.includes(normalizedTargetMetricTable)) {
  patched = patched.replace(normalizedTargetMetricTable, normalizedReplacementMetricTable);
  console.log("renderMetricTable patched successfully!");
} else {
  console.log("Could not find renderMetricTable target");
}

if (patched.includes(normalizedTargetStep3Chart)) {
  patched = patched.replace(normalizedTargetStep3Chart, normalizedReplacementStep3Chart);
  console.log("step 3 chartData patched successfully!");
} else {
  console.log("Could not find step 3 chartData target");
}

fs.writeFileSync('src/components/monday/MondayModePage.tsx', patched.replace(/\n/g, '\r\n'), 'utf-8');
