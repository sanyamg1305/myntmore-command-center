const fs = require('fs');

let content = fs.readFileSync('src/components/monday/MondayModePage.tsx', 'utf-8');

const targetStr = `                      {monthWeeks.map(w => {
                        const rowData = weeklyHistory.find(r => r.week_start === w.weekStart)
                        const wBuilt = buildWeekMetrics(rowData)
                        const val = m.id === 'C_IPP' ? wBuilt?.impressionsPerPost : wBuilt?.[m.id as keyof typeof wBuilt]
                        return (
                          <TableCell key={w.weekStart} className={cn("text-center text-sm font-black", w.weekStart === selectedWeek && "bg-gold/5")}>
                            {m.id === 'C_IPP' ? fmt(val) : fmt(val)}
                          </TableCell>
                        )
                      })}`;

const replacementStr = `                      {monthWeeks.map(w => {
                        const rowData = weeklyHistory.find(r => r.week_start === w.weekStart)
                        let displayVal: string
                        if (m.id === 'C_IPP') {
                          const wBuilt = buildWeekMetrics(rowData)
                          displayVal = fmt(wBuilt?.impressionsPerPost)
                        } else {
                          displayVal = fmtMetricCell(rowData, m.id, 'content_metrics')
                        }
                        
                        return (
                          <TableCell key={w.weekStart} className={cn("text-center text-sm font-black", w.weekStart === selectedWeek && "bg-gold/5")}>
                            {displayVal}
                          </TableCell>
                        )
                      })}`;

content = content.replace(targetStr, replacementStr);

const targetBlockersStr = `<p className="text-xl font-black">{weekMetrics?.C20 ? '-' : '-'}</p>`;
const replacementBlockersStr = `<p className="text-xl font-black">{fmtMetricCell(currentData, 'C20', 'content_metrics')}</p>`;

content = content.replace(targetBlockersStr, replacementBlockersStr);

fs.writeFileSync('src/components/monday/MondayModePage.tsx', content);
