import { createFileRoute } from '@tanstack/react-router'
import { TeamSettingsPage } from '../components/settings/TeamSettingsPage'

export const Route = createFileRoute('/settings/team')({
  component: TeamSettingsPage,
})
