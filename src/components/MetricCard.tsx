import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Trophy, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import { Metric, resolveAutoCalc } from "@/data/metrics"
import { cn } from "@/lib/utils"
import { fmtDelta } from "@/utils/format"

interface MetricCardProps {
  metric: Metric
  value: number | string | boolean
  target?: number
  previousValue?: number | string
  lifetimeHigh?: number
  lifetimeHighWeek?: string
  isNewRecord?: boolean
  onChange: (value: number | string | boolean) => void
  weeklyTarget?: number
  monthlyTarget?: number
  onNoteChange?: (note: string) => void
  note?: string
  readOnly?: boolean
  allValues?: Record<string, any> // Needed for auto-calc
}

export function MetricCard({
  metric,
  value,
  target,
  previousValue,
  lifetimeHigh,
  lifetimeHighWeek,
  isNewRecord,
  onChange,
  onNoteChange,
  note,
  readOnly,
  weeklyTarget,
  monthlyTarget,
  allValues = {}
}: MetricCardProps) {
  const [showNote, setShowNote] = useState(!!note)

  const achievement = (target && typeof value === 'number') 
    ? Math.round((value / target) * 100) 
    : null

  const deltaFormat = (typeof value === 'number' && typeof previousValue === 'number')
    ? fmtDelta(value, previousValue, { unit: metric.type === 'percentage' ? '%' : undefined })
    : null

  const renderInput = () => {
    if (metric.type === 'auto') {
      const autoValue = resolveAutoCalc(metric.id, allValues)
      return (
        <div className="bg-gold-soft border border-gold/20 rounded-md p-2 text-right font-bold text-2xl h-12 flex items-center justify-end px-3">
          {autoValue}{metric.unit}
        </div>
      )
    }

    switch (metric.type) {
      case 'number':
      case 'percentage':
        return (
          <div className="relative">
            <Input
              type="number"
              value={value as number}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              disabled={readOnly}
              className="text-right text-2xl font-bold h-12 pr-8"
            />
            {metric.type === 'percentage' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
            )}
            {metric.unit && metric.type !== 'percentage' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{metric.unit}</span>
            )}
          </div>
        )
      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            placeholder="Enter details..."
            className="min-h-[100px] resize-y transition-all focus:min-h-[150px]"
          />
        )
      case 'boolean':
        return (
          <div className="flex justify-center py-2">
            <Switch
              checked={!!value}
              onCheckedChange={onChange}
              disabled={readOnly}
              className="scale-150 data-[state=checked]:bg-gold"
            />
          </div>
        )
      case 'slider':
        return (
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-end">
              <span className="text-4xl font-bold text-gold">{value}</span>
              <span className="text-muted-foreground text-sm">/ 10</span>
            </div>
            <Slider
              value={[value as number || 0]}
              max={10}
              step={1}
              onValueChange={([val]) => onChange(val)}
              disabled={readOnly}
              className="[&_[role=slider]]:bg-gold"
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all border-2",
      isNewRecord ? "border-gold animate-pulse shadow-[0_0_15px_rgba(255,201,71,0.3)]" : "border-border"
    )}>
      {isNewRecord && (
        <div className="bg-gold text-black text-[10px] font-black py-0.5 px-2 absolute top-0 left-0 right-0 text-center uppercase tracking-widest flex items-center justify-center gap-1">
          <Trophy className="w-3 h-3" /> NEW RECORD
        </div>
      )}
      <CardContent className={cn("p-4 space-y-4", isNewRecord && "pt-6")}>
        <div className="flex justify-between items-start">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-tight leading-tight">
            {metric.name}
          </Label>
          <Badge variant="outline" className="text-[10px] font-bold uppercase py-0 px-1.5 opacity-50">
            {metric.id}
          </Badge>
        </div>

        {renderInput()}

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          {metric.hasTarget && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Target</Label>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Target: {target !== null && target !== undefined && target > 0
                  ? <span style={{ color: '#000', fontWeight: '600' }}>{target}</span>
                  : <span style={{ color: '#ccc' }}>No target set</span>
                }
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '6px', display: 'flex', gap: '16px' }}>
                <span>
                  W.Target: {weeklyTarget
                    ? <strong style={{ color: '#000' }}>{weeklyTarget}</strong>
                    : <span style={{ color: '#ccc' }}>—</span>}
                </span>
                <span>
                  M.Target: {monthlyTarget
                    ? <strong style={{ color: '#000' }}>{monthlyTarget}</strong>
                    : <span style={{ color: '#ccc' }}>—</span>}
                </span>
              </div>
            </div>
          )}
          {achievement !== null && (
            <div className="space-y-1 text-right">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Achievement</Label>
              <div className={cn(
                "text-sm font-bold h-7 flex items-center justify-end",
                achievement >= 100 ? "text-status-on" : achievement >= 80 ? "text-status-risk" : "text-status-off"
              )}>
                {achievement}%
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/30">
          <div className="flex items-center gap-1">
            <span>← Previous:</span>
            <span className="font-bold text-foreground">{previousValue ?? '-'}</span>
            {deltaFormat && deltaFormat.text !== '—' && (
              <span className={cn(
                "font-bold ml-1",
                deltaFormat.isPositive ? "text-status-on" : "text-status-off"
              )} style={{ color: deltaFormat.color }}>
                {deltaFormat.text}
              </span>
            )}
          </div>
          {lifetimeHigh !== undefined && (
            <div className="flex items-center gap-1 text-gold font-bold">
              <Trophy className="w-3 h-3" />
              <span>{lifetimeHigh}</span>
              <span className="opacity-60 font-normal">· {lifetimeHighWeek || 'N/A'}</span>
            </div>
          )}
        </div>

        {metric.hasNote && (
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setShowNote(!showNote)}
              className="text-[10px] font-bold uppercase flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              {showNote ? 'Hide Note' : 'Add Note'}
              {showNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showNote && (
              <Textarea
                value={note || ''}
                onChange={(e) => onNoteChange?.(e.target.value)}
                disabled={readOnly}
                placeholder="Add context..."
                className="text-xs min-h-[60px] bg-muted/30"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
