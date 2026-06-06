import { createFileRoute } from '@tanstack/react-router'
import { MMContentPage } from '../components/mm/MMContentPage'

export const Route = createFileRoute('/mm-content')({
  component: MMContentPage,
})
