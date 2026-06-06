import { createFileRoute } from '@tanstack/react-router'
import { FinancePage } from '../components/finance/FinancePage'

export const Route = createFileRoute('/finance')({
  component: FinancePage,
})
