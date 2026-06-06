import { createFileRoute } from '@tanstack/react-router'
import { MondayModePage } from '../components/monday/MondayModePage'

export const Route = createFileRoute('/monday-mode')({
  component: MondayModePage,
})
