const fs = require('fs');

let content = fs.readFileSync('src/components/monday/MondayModePage.tsx', 'utf-8');

// Ensure dataMap is accessible in renderClientView and passed to LeadGenCampaignsStep
const targetState = `        const sortedHistory = monthWeeks.map(w => dataMap[w.weekStart] || { week_start: w.weekStart, week_label: w.shortLabel })
        setWeeklyHistory(sortedHistory)`;

const replacementState = `        const sortedHistory = monthWeeks.map(w => dataMap[w.weekStart] || { week_start: w.weekStart, week_label: w.shortLabel })
        setWeeklyHistory(sortedHistory)
        setWeeklyDataMap(dataMap)`;

if (!content.includes('setWeeklyDataMap(dataMap)')) {
  content = content.replace(targetState, replacementState);
  content = content.replace(
    `const [weeklyHistory, setWeeklyHistory] = useState<any[]>([])`,
    `const [weeklyHistory, setWeeklyHistory] = useState<any[]>([])\n  const [weeklyDataMap, setWeeklyDataMap] = useState<Record<string, any>>({})`
  );
}

// Modify LeadGenCampaignsStep signature
content = content.replace(
  `function LeadGenCampaignsStep({ client, weekData, monthWeeks, highScoreMap, onEditCampaign }: any) {`,
  `function LeadGenCampaignsStep({ client, weekData, monthWeeks, highScoreMap, dataMap, onEditCampaign, selectedWeek }: any) {`
);

// Modify its invocation
content = content.replace(
  `<LeadGenCampaignsStep 
            client={currentItem} 
            weekData={currentData} 
            monthWeeks={monthWeeks} 
            highScoreMap={highScoreMap}
            onEditCampaign={(c: any) => setEditingCampaign(c)}
          />`,
  `<LeadGenCampaignsStep 
            client={currentItem} 
            weekData={currentData} 
            monthWeeks={monthWeeks} 
            highScoreMap={highScoreMap}
            dataMap={weeklyDataMap}
            selectedWeek={selectedWeek}
            onEditCampaign={(c: any) => setEditingCampaign(c)}
          />`
);

// Let's rewrite LeadGenCampaignsStep TableBody and headers
const regexLeadGenHeader = /<TableHeader className="bg-\[\#FFC947\]">[\s\S]*?<\/TableHeader>/g;
content = content.replace(regexLeadGenHeader, `<TableHeader className="bg-[#FFC947]">
              <TableRow>
                <TableHead style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '700', width: '200px', color: 'black' }}>
                  METRIC
                </TableHead>
                {monthWeeks.map((w: any) => (
                  <TableHead 
                    key={w.weekStart} 
                    style={{ 
                      padding: '10px', 
                      textAlign: 'center', 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      backgroundColor: w.weekStart === selectedWeek ? 'rgba(255, 201, 71, 0.1)' : 'transparent',
                      color: w.weekStart === selectedWeek ? 'black' : 'black' 
                    }}
                  >
                    {w.shortLabel}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>`);

const regexLeadGenBody = /<TableBody>[\s\S]*?{MONDAY_LEADGEN_ROWS\.map[\s\S]*?<\/TableBody>/g;
content = content.replace(regexLeadGenBody, `<TableBody>
              {LEADGEN_ROWS.map((rowDef, i) => {
                const highScore = highScoreMap[rowDef.id]
                return (
                  <TableRow key={rowDef.id} style={{
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                  }}>
                    <TableCell style={{ padding: '12px 10px', fontSize: '12px', fontWeight: '700', borderRight: '1px solid #E5E7EB' }}>
                      {rowDef.label}
                      {highScore && (
                        <div style={{ fontSize: '9px', color: '#D4AF37', marginTop: '2px', fontWeight: '900' }}>
                          🏆 Best: {fmt(highScore.value)}
                        </div>
                      )}
                    </TableCell>
                    
                    {monthWeeks.map((w: any, colIdx: number) => {
                      const val = resolveCell(rowDef, rowDef.id, dataMap[w.weekStart])
                      return (
                        <TableCell 
                          key={w.weekStart} 
                          style={{ 
                            padding: '12px 10px', 
                            textAlign: 'center', 
                            fontSize: '12px', 
                            fontWeight: '900',
                            backgroundColor: w.weekStart === selectedWeek ? 'rgba(255, 201, 71, 0.05)' : (colIdx % 2 === 0 ? 'transparent' : '#F9FAFB')
                          }}
                        >
                          {val}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>`);

// Fix existing connections table
const regexExistingHeader = /<TableHeader className="bg-muted\/30">[\s\S]*?<\/TableHeader>/g;
content = content.replace(regexExistingHeader, `<TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '700', width: '200px', color: 'black' }}>
                  METRIC
                </TableHead>
                {monthWeeks.map((w: any) => (
                  <TableHead 
                    key={w.weekStart} 
                    style={{ 
                      padding: '10px', 
                      textAlign: 'center', 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      backgroundColor: w.weekStart === selectedWeek ? 'rgba(255, 201, 71, 0.1)' : 'transparent',
                      color: w.weekStart === selectedWeek ? 'black' : 'black' 
                    }}
                  >
                    {w.shortLabel}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>`);

const regexExistingBody = /<TableBody>[\s\S]*?Existing Conn Sent[\s\S]*?<\/TableBody>/g;
content = content.replace(regexExistingBody, `<TableBody>
              {EXISTING_CONN_ROWS.map((rowDef, i) => {
                const highScore = highScoreMap[rowDef.id]
                return (
                  <TableRow key={rowDef.id} style={{
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                  }}>
                    <TableCell style={{ padding: '12px 10px', fontSize: '12px', fontWeight: '700', borderRight: '1px solid #E5E7EB' }}>
                      {rowDef.label}
                      {highScore && (
                        <div style={{ fontSize: '9px', color: '#D4AF37', marginTop: '2px', fontWeight: '900' }}>
                          🏆 Best: {fmt(highScore.value)}
                        </div>
                      )}
                    </TableCell>
                    
                    {monthWeeks.map((w: any, colIdx: number) => {
                      const val = resolveCell(rowDef, rowDef.id, dataMap[w.weekStart])
                      return (
                        <TableCell 
                          key={w.weekStart} 
                          style={{ 
                            padding: '12px 10px', 
                            textAlign: 'center', 
                            fontSize: '12px', 
                            fontWeight: '900',
                            backgroundColor: w.weekStart === selectedWeek ? 'rgba(255, 201, 71, 0.05)' : (colIdx % 2 === 0 ? 'transparent' : '#F9FAFB')
                          }}
                        >
                          {val}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>`);

// Fix Content Table Header
const regexContentHeader = /<TableHeader className="bg-muted\/50">[\s\S]*?<\/TableHeader>/g;
content = content.replace(regexContentHeader, `<TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase w-[200px]">Metric</TableHead>
                  {monthWeeks.map(w => (
                    <TableHead 
                      key={w.weekStart} 
                      className={cn("text-center font-black text-[10px] uppercase", w.weekStart === selectedWeek && "bg-gold/10 text-gold")}
                      style={{ 
                        backgroundColor: w.weekStart === selectedWeek ? 'rgba(255, 201, 71, 0.1)' : 'transparent',
                        color: w.weekStart === selectedWeek ? '#D4AF37' : 'inherit' 
                      }}
                    >
                      {w.shortLabel}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black text-[10px] uppercase">Target</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Ach%</TableHead>
                </TableRow>
              </TableHeader>`);

const regexContentBody = /<TableBody>[\s\S]*?MONDAY_CONTENT_METRICS\.slice[\s\S]*?<\/TableBody>/g;
content = content.replace(regexContentBody, `<TableBody>
                {CONTENT_ROWS.map((rowDef, i) => {
                  const target = targets.find(t => t.metric_id === rowDef.id && t.target_type === 'weekly' && t.period === weekPeriod)?.target_value ?? null
                  const currentValRaw = currentData?.content_metrics?.[rowDef.id]?.value ?? currentData?.content_metrics?.[rowDef.id]
                  const ach = (target && currentValRaw !== null && currentValRaw !== undefined) ? Math.round((Number(currentValRaw) / target) * 100) : null
                  const highScore = highScoreMap[rowDef.id]

                  return (
                    <TableRow key={rowDef.id} style={{
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                    }}>
                      <TableCell className="font-bold text-xs py-3 border-r" style={{ padding: '12px 10px', fontSize: '12px', fontWeight: '700', borderRight: '1px solid #E5E7EB' }}>
                        {rowDef.label}
                        {highScore && (
                          <div className="text-[9px] text-gold mt-0.5 flex items-center gap-1 font-black" style={{ fontSize: '9px', color: '#D4AF37', marginTop: '2px', fontWeight: '900' }}>
                            <Trophy className="w-2.5 h-2.5" /> Best: {fmt(highScore.value)}
                          </div>
                        )}
                      </TableCell>
                      {monthWeeks.map((w: any, colIdx: number) => {
                        const val = resolveCell(rowDef, rowDef.id, weeklyDataMap[w.weekStart])
                        return (
                          <TableCell 
                            key={w.weekStart} 
                            className={cn("text-center text-sm font-black")}
                            style={{ 
                              padding: '12px 10px', 
                              textAlign: 'center', 
                              fontSize: '12px', 
                              fontWeight: '900',
                              backgroundColor: w.weekStart === selectedWeek ? 'rgba(255, 201, 71, 0.05)' : (colIdx % 2 === 0 ? 'transparent' : '#F9FAFB')
                            }}
                          >
                            {val}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center text-muted-foreground font-bold border-l" style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', color: '#666', borderLeft: '1px solid #E5E7EB' }}>{fmt(target)}</TableCell>
                      <TableCell className="text-center font-black" style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '900' }}>{ach ? \`\${ach}%\` : '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>`);

fs.writeFileSync('src/components/monday/MondayModePage.tsx', content);
