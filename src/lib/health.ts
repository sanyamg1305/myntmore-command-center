import { supabase } from "@/integrations/supabase/client"

export function calculateHealthScore(
  contentMetrics: Record<string, any>,
  leadgenMetrics: Record<string, any>,
  targets: Record<string, any>
): { score: number; breakdown: Record<string, number> } {

  const get = (metrics: any, id: string) => 
    Number(metrics?.[id]?.value ?? 0)
  
  const target = (id: string) => 
    Number(targets?.[id] ?? 0)
  
  const pct = (actual: number, tgt: number) => 
    tgt > 0 ? Math.min((actual / tgt) * 100, 100) : 0

  // Acceptance Rate — 20 points
  const acceptanceRate = get(leadgenMetrics, 'L12')
  const acceptanceScore = Math.min(acceptanceRate, 100) * 0.20

  // Positive Replies Achievement — 25 points
  const positiveReplies = get(leadgenMetrics, 'L15')
  const positiveTarget = target('L15')
  const positiveScore = pct(positiveReplies, positiveTarget) * 0.25

  // Meetings Booked Achievement — 20 points
  const meetings = get(leadgenMetrics, 'L24')
  const meetingsTarget = target('L24')
  const meetingsScore = pct(meetings, meetingsTarget) * 0.20

  // Posts Published Achievement — 15 points
  const posts = get(contentMetrics, 'C09')
  const postsTarget = target('C09')
  const postsScore = pct(posts, postsTarget) * 0.15

  // Impressions Achievement — 10 points
  const impressions = get(contentMetrics, 'C10')
  const impressionsTarget = target('C10')
  const impressionsScore = pct(impressions, impressionsTarget) * 0.10

  // Happiness Index — 10 points (0–10 scale → 0–100)
  const happiness = get(leadgenMetrics, 'L30')
  const happinessScore = (happiness / 10) * 100 * 0.10

  const total = acceptanceScore + positiveScore + meetingsScore + 
                postsScore + impressionsScore + happinessScore

  return {
    score: Math.round(total),
    breakdown: {
      acceptanceRate: Math.round(acceptanceScore),
      positiveReplies: Math.round(positiveScore),
      meetingsBooked: Math.round(meetingsScore),
      postsPublished: Math.round(postsScore),
      impressions: Math.round(impressionsScore),
      happiness: Math.round(happinessScore)
    }
  }
}

export async function updateClientHealth(
  clientId: string,
  weekStart: string,
  contentMetrics: Record<string, any>,
  leadgenMetrics: Record<string, any>
) {
  try {
    // 1. Fetch weekly targets for this client and week
    // Targets are stored with period = weekStart (YYYY-MM-DD), NOT week-number format
    const { data: targetsData } = await supabase
      .from('targets')
      .select('metric_id, target_value')
      .eq('client_id', clientId)
      .eq('target_type', 'weekly')
      .eq('period', weekStart)

    const targets: Record<string, number> = {}
    targetsData?.forEach(t => targets[t.metric_id] = t.target_value ?? 0)

    // 2. Calculate score
    const { score, breakdown } = calculateHealthScore(contentMetrics, leadgenMetrics, targets)

    // 3. Fetch previous score
    const { data: prev } = await supabase
      .from('client_health_scores')
      .select('health_score')
      .eq('client_id', clientId)
      .lt('week_start', weekStart)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 4. Upsert score
    const { error } = await supabase
      .from('client_health_scores')
      .upsert({
        client_id: clientId,
        week_start: weekStart,
        health_score: score,
        previous_score: prev?.health_score || null,
        score_breakdown: breakdown,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,week_start' })

    if (error) throw error
    
    // 5. Update Streaks
    const streaks = await calculateStreaks(clientId, weekStart)
    if (streaks) {
        await supabase
            .from('client_health_scores')
            .update({
                on_track_streak: streaks.onTrackStreak,
                posts_on_target_streak: streaks.postsStreak
            })
            .eq('client_id', clientId)
            .eq('week_start', weekStart)
    }

    // 6. Check Happiness Alerts
    await checkHappinessAlert(clientId, weekStart)

    return { score, prevScore: prev?.health_score }
  } catch (err) {
    console.error("Health calculation failed", err)
    return null
  }
}

export async function calculateStreaks(clientId: string, weekStart: string) {
  try {
    // Get last 12 weeks of health scores
    const { data: history } = await supabase
        .from('client_health_scores')
        .select('week_start, health_score')
        .eq('client_id', clientId)
        .lte('week_start', weekStart)
        .order('week_start', { ascending: false })
        .limit(12)

    // On Track streak = consecutive weeks with health_score >= 70
    let onTrackStreak = 0
    for (const week of history || []) {
        if (Number(week.health_score) >= 70) onTrackStreak++
        else break
    }

    // Posts on target streak — consecutive weeks where C09 actual >= C09 weekly target
    const { data: weeklyData } = await supabase
        .from('weekly_data')
        .select('week_start, content_metrics')
        .eq('client_id', clientId)
        .lte('week_start', weekStart)
        .order('week_start', { ascending: false })
        .limit(12)

    const { data: weeklyTargets } = await supabase
        .from('targets')
        .select('period, target_value')
        .eq('client_id', clientId)
        .eq('metric_id', 'C09')
        .eq('target_type', 'weekly')

    let postsStreak = 0
    for (const week of weeklyData ?? []) {
        const postsActual = (week.content_metrics as any)?.C09?.value ?? 0
        // Targets are stored with period = week_start (YYYY-MM-DD)
        const target = weeklyTargets?.find(t => t.period === week.week_start)?.target_value ?? 0
        if (target > 0 && postsActual >= target) postsStreak++
        else break
    }

    return { onTrackStreak, postsStreak }
  } catch (err) {
    console.error("Streak calculation failed", err)
    return null
  }
}

export async function checkHappinessAlert(clientId: string, currentWeekStart: string) {
  try {
    const { data: recentWeeks } = await supabase
      .from('weekly_data')
      .select('week_start, leadgen_metrics')
      .eq('client_id', clientId)
      .lte('week_start', currentWeekStart)
      .order('week_start', { ascending: false })
      .limit(3)

    // Only include weeks that actually have a happiness value entered
    const scores = (recentWeeks
      ?.map(w => {
        const raw = (w.leadgen_metrics as any)?.L30?.value
        if (raw === null || raw === undefined || raw === '') return null
        const n = Number(raw)
        return isNaN(n) ? null : n
      })
      .filter((v): v is number => v !== null)) ?? []

    if (scores.length < 2) return null

    const [thisWeek, lastWeek, weekBefore] = scores

    let alert: any = null

    // Alert condition 1: below 6 for 2+ consecutive weeks
    if (thisWeek < 6 && lastWeek < 6) {
        alert = {
            alert_type: 'consecutive_low_happiness',
            alert_message: `Happiness Index has been below 6 for 2+ weeks (${lastWeek} → ${thisWeek}). Recommend check-in call.`,
            severity: 'high'
        }
    } else if (lastWeek - thisWeek >= 3) {
        // Alert condition 2: single week drop of 3+ points
        alert = {
            alert_type: 'happiness_drop',
            alert_message: `Happiness Index dropped sharply from ${lastWeek} to ${thisWeek} this week.`,
            severity: 'medium'
        }
    }

    if (alert) {
        await supabase.from('client_alerts').upsert({
            client_id: clientId,
            week_start: currentWeekStart,
            ...alert,
            is_resolved: false
        }, { onConflict: 'client_id,alert_type,week_start' })
    }
  } catch (err) {
    console.error("Happiness alert check failed", err)
  }
}

