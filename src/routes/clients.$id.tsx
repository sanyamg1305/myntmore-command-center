import { createFileRoute } from '@tanstack/react-router'
import { ClientDetailPage } from '../components/clients/ClientDetailPage'

export const Route = createFileRoute('/clients/$id')({
  component: ClientDetailPage,
})
