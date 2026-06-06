import { createFileRoute, redirect } from '@tanstack/react-router'
import { SettingsTargetsPage } from '../components/settings/SettingsTargetsPage'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/settings/targets')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (roleData?.role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SettingsTargetsPage,
})
