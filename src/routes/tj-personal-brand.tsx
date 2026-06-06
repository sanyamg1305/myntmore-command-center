import { createFileRoute } from '@tanstack/react-router'
import { TJPersonalBrandPage } from '../components/tj-brand/TJBrandPage'

export const Route = createFileRoute('/tj-personal-brand')({
  component: TJPersonalBrandPage,
})
