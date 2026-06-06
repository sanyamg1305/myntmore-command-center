import { createFileRoute } from '@tanstack/react-router'
import { DataEntryPage } from '../components/data-entry/DataEntryPage'

export const Route = createFileRoute('/data-entry')({
  component: DataEntryPage,
})
