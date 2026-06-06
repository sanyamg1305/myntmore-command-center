import { createFileRoute } from '@tanstack/react-router'
import { ExportPage } from '../components/settings/ExportPage'

export const Route = createFileRoute('/settings/export')({
  component: ExportPage,
})
