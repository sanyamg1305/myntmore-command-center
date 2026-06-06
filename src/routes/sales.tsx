import { createFileRoute } from '@tanstack/react-router'
import { SalesOutreachPage } from '../components/sales/SalesPage'

export const Route = createFileRoute('/sales')({
  component: SalesOutreachPage,
})
