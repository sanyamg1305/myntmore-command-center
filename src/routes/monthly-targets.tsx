import { createFileRoute, redirect } from '@tanstack/react-router'
import { MonthlyProgressPage } from '../components/monthly/MonthlyProgressPage'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/monthly-targets')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: MonthlyProgressPage,
})
