const fs = require('fs');

// 1. Add formatDashboardValue to format.tsx
let formatContent = fs.readFileSync('src/utils/format.tsx', 'utf-8');
if (!formatContent.includes('export function formatDashboardValue')) {
  formatContent += `
export function formatDashboardValue(val: number | null, metricId: string): string {
  if (val === null || val === undefined) return '—'  // not entered
  if (val === 0) return '0'     // explicitly entered as 0
  
  // Percentage metrics
  const pctMetrics = ['L12','L14','L17','L18','L21','L26','L30','L34','L05', 'C05']
  if (pctMetrics.includes(metricId)) {
    return Number(val).toFixed(1) + '%'
  }

  const n = Number(val)
  if (isNaN(n)) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return n.toLocaleString('en-IN')
  return String(n)
}
`;
  fs.writeFileSync('src/utils/format.tsx', formatContent, 'utf-8');
  console.log("Added formatDashboardValue to format.tsx");
}

// 2. Patch metricCalculations.ts buildWeekMetrics to handle unsubmitted
let calcContent = fs.readFileSync('src/utils/metricCalculations.ts', 'utf-8');
const originalBuildFn = `export function buildWeekMetrics(weekRow: any) {
  if (!weekRow) return null

  const cm = weekRow.content_metrics ?? {}
  const lm = weekRow.leadgen_metrics ?? {}

  const result: Record<string, any> = {}

  ALL_METRICS.forEach(m => {
    const raw = m.category === 'content' ? cm[m.id] : lm[m.id]
    let val = typeof raw === 'object' && raw !== null && 'value' in raw ? raw.value : raw
    
    if (m.type === 'number' || m.type === 'slider' || m.type === 'percentage') {
      val = val === null || val === undefined || val === '' ? null : Number(val)
      if (isNaN(val as number)) val = null
    } else if (m.type === 'boolean') {
      val = !!val
    }
    
    result[m.id] = val
  })`;

const newBuildFn = `export function buildWeekMetrics(weekRow: any) {
  if (!weekRow) return null

  const cm = weekRow.content_metrics ?? {}
  const lm = weekRow.leadgen_metrics ?? {}

  const result: Record<string, any> = {}

  ALL_METRICS.forEach(m => {
    const raw = m.category === 'content' ? cm[m.id] : lm[m.id]
    
    // Check if submitted for client weekly_data
    if (weekRow.client_id) {
      const isSubmitted = m.category === 'content' 
        ? !!weekRow.content_submitted_at 
        : !!weekRow.leadgen_submitted_at

      if (!isSubmitted) {
        result[m.id] = null
        return
      }
    }

    let val = typeof raw === 'object' && raw !== null && 'value' in raw ? raw.value : raw
    
    if (m.type === 'number' || m.type === 'slider' || m.type === 'percentage') {
      val = val === null || val === undefined || val === '' ? null : Number(val)
      if (isNaN(val as number)) val = null
    } else if (m.type === 'boolean') {
      val = val === null || val === undefined ? null : (val === true || val === 'true' || val === 1)
    }
    
    result[m.id] = val
  })`;

const normCalc = calcContent.replace(/\r\n/g, '\n');
const normOriginal = originalBuildFn.replace(/\r\n/g, '\n');
const normNew = newBuildFn.replace(/\r\n/g, '\n');

if (normCalc.includes(normOriginal)) {
  fs.writeFileSync('src/utils/metricCalculations.ts', normCalc.replace(normOriginal, normNew).replace(/\n/g, '\r\n'), 'utf-8');
  console.log("Updated buildWeekMetrics in metricCalculations.ts");
} else {
  console.log("Could not find buildWeekMetrics in metricCalculations.ts");
}

// 3. Patch DashboardPage.tsx
let dashContent = fs.readFileSync('src/components/dashboard/DashboardPage.tsx', 'utf-8');
// Import formatDashboardValue
if (!dashContent.includes('formatDashboardValue')) {
  dashContent = dashContent.replace(
    'import { fmt as gFmt, fmtDelta, Delta, fmtPct, fmtPctDelta } from "@/utils/format"',
    'import { fmt as gFmt, fmtDelta, Delta, fmtPct, fmtPctDelta, formatDashboardValue } from "@/utils/format"'
  );
}

// Replace summary row renders
dashContent = dashContent.replace(/formatMetricDisplay\(built\?\.C09,\s*'C09'\)/g, "formatDashboardValue(built?.C09, 'C09')");
dashContent = dashContent.replace(/formatMetricDisplay\(built\?\.C10,\s*'C10'\)/g, "formatDashboardValue(built?.C10, 'C10')");
dashContent = dashContent.replace(/formatMetricDisplay\(built\?\.L10,\s*'L10'\)/g, "formatDashboardValue(built?.L10, 'L10')");
dashContent = dashContent.replace(/formatMetricDisplay\(built\?\.L24,\s*'L24'\)/g, "formatDashboardValue(built?.L24, 'L24')");

// Replace MetricTable cell renders
const targetCellCurrent = `{['L12', 'L14', 'L17'].includes(m.id) ? formatPct(current as number) : formatMetricDisplay(current, m.id)}`;
const replacementCellCurrent = `{formatDashboardValue(current as number | null, m.id)}`;

const targetCellPrev = `{['L12', 'L14', 'L17'].includes(m.id) ? formatPct(prev as number) : formatMetricDisplay(prev, m.id)}`;
const replacementCellPrev = `{formatDashboardValue(prev as number | null, m.id)}`;

const normDash = dashContent.replace(/\r\n/g, '\n');
const normT1 = targetCellCurrent.replace(/\r\n/g, '\n');
const normR1 = replacementCellCurrent.replace(/\r\n/g, '\n');
const normT2 = targetCellPrev.replace(/\r\n/g, '\n');
const normR2 = replacementCellPrev.replace(/\r\n/g, '\n');

let newDash = normDash;
if (newDash.includes(normT1)) {
  newDash = newDash.replace(normT1, normR1);
  console.log("Patched MetricTable current cell in DashboardPage.tsx");
}
if (newDash.includes(normT2)) {
  newDash = newDash.replace(normT2, normR2);
  console.log("Patched MetricTable prev cell in DashboardPage.tsx");
}

// Replace WeeklyBreakdown cell renders
const targetBreakdown = `{['L12', 'L14', 'L17'].includes(m.id) ? formatPct(val as number) : formatMetricDisplay(val, m.id)}`;
const replacementBreakdown = `{formatDashboardValue(val as number | null, m.id)}`;
const normTB = targetBreakdown.replace(/\r\n/g, '\n');
const normRB = replacementBreakdown.replace(/\r\n/g, '\n');
if (newDash.includes(normTB)) {
  newDash = newDash.replace(normTB, normRB);
  console.log("Patched WeeklyBreakdown cell in DashboardPage.tsx");
}

fs.writeFileSync('src/components/dashboard/DashboardPage.tsx', newDash.replace(/\n/g, '\r\n'), 'utf-8');
