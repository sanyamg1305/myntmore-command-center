import { createFileRoute } from '@tanstack/react-router'
import { ClientsPage } from '../components/clients/ClientsPage'

export const Route = createFileRoute('/clients')({
  component: ClientsPage,
})
