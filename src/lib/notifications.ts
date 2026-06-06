import { supabase } from "@/integrations/supabase/client"

export async function checkClientNotifications() {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, birthday, myntmore_start_date')
    .eq('status', 'active')
  
  if (!clients) return

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const next30Days = new Date(today)
  next30Days.setDate(today.getDate() + 30)

  for (const client of clients) {
    // Check Birthday
    if (client.birthday) {
      const bday = new Date(client.birthday)
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
      
      if (thisYearBday >= today && thisYearBday <= next30Days) {
        await supabase.from('client_notifications').upsert({
          client_id: client.id,
          notification_type: 'birthday',
          message: `${client.name}'s Birthday is on ${thisYearBday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}!`,
          trigger_date: thisYearBday.toISOString().split('T')[0],
          is_dismissed: false
        }, { onConflict: 'client_id,notification_type,trigger_date' })
      }
    }

    // Check Work Anniversary
    if (client.myntmore_start_date) {
      const start = new Date(client.myntmore_start_date)
      const thisYearAnniversary = new Date(today.getFullYear(), start.getMonth(), start.getDate())
      const years = today.getFullYear() - start.getFullYear()
      
      if (years > 0 && thisYearAnniversary >= today && thisYearAnniversary <= next30Days) {
        await supabase.from('client_notifications').upsert({
          client_id: client.id,
          notification_type: 'anniversary',
          message: `${client.name}'s ${years} Year Work Anniversary is on ${thisYearAnniversary.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}!`,
          trigger_date: thisYearAnniversary.toISOString().split('T')[0],
          is_dismissed: false
        }, { onConflict: 'client_id,notification_type,trigger_date' })
      }
    }
  }
}

export async function dismissNotification(notificationId: string) {
    const { error } = await supabase
        .from('client_notifications')
        .update({ is_dismissed: true })
        .eq('id', notificationId)
    return !error
}
