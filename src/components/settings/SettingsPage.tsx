import React, { useState } from 'react'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TeamSettingsPage } from './TeamSettingsPage'
import { ExportPage } from './ExportPage'
import { SettingsTargetsPage } from './SettingsTargetsPage'
import { TJChannelAssignmentsTab } from './TJChannelAssignmentsTab'
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/BackButton"


export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'team' | 'clients' | 'metrics' | 'export' | 'targets' | 'tj_channels'>('team')

  const tabs = [
    { id: 'team', label: 'Team' },
    { id: 'clients', label: 'Clients' },
    { id: 'targets', label: 'Targets' },
    { id: 'metrics', label: 'Metric Fields' },
    { id: 'tj_channels', label: 'TJ Channels' },
    { id: 'export', label: 'Export' },
  ]

  return (
    <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b bg-background px-3">
            <SidebarTrigger />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Settings
            </span>
          </header>
          <main className="flex-1 bg-background p-8">
            <div className="mx-auto max-w-6xl">
              <BackButton to="/dashboard" label="Back to Dashboard" />
              <h1 className="text-3xl font-bold tracking-tight mb-6">Settings</h1>

              
              <div className="flex gap-2 border-b mb-8">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${
                      activeTab === tab.id 
                        ? 'border-gold text-gold' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {activeTab === 'team' && <TeamSettingsPage />}
                {activeTab === 'export' && <ExportPage />}
                {activeTab === 'targets' && <SettingsTargetsPage />}
                {activeTab === 'tj_channels' && <TJChannelAssignmentsTab />}
                {activeTab === 'clients' && (
                  <div className="p-12 text-center border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground font-bold mb-4">Client Management System</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Coming Soon</p>
                  </div>
                )}
                {activeTab === 'metrics' && (
                  <div className="p-12 text-center border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground font-bold mb-4">Metric Field Configuration</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Coming Soon</p>
                  </div>
                )}
              </div>
            </div>
          </main>
    </div>
  )
}
