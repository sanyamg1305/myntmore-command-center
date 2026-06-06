import React from 'react'
import { BackButton } from "@/components/ui/BackButton"

export function FinancePage() {
  return (
    <div className="p-8">
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <h1 className="text-3xl font-bold tracking-tight mb-4">Finance</h1>
      <div className="p-12 text-center border rounded-lg bg-muted/20">
        <p className="text-muted-foreground font-bold">Finance & Expenses — coming soon.</p>
      </div>
    </div>
  )
}
