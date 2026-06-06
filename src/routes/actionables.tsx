import { createFileRoute } from '@tanstack/react-router'
import { ActionablesPage } from '../components/actionables/ActionablesPage'

export const Route = createFileRoute('/actionables')({
  component: ActionablesPage,
})
