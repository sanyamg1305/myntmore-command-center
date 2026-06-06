import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../integrations/supabase/client'

// Cached token so the beforeunload handler (synchronous) can attach auth headers
let _cachedAccessToken: string | null = null
supabase.auth.getSession().then(({ data }) => {
  _cachedAccessToken = data.session?.access_token ?? null
})
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedAccessToken = session?.access_token ?? null
})

interface AutoSaveOptions {
  table: string
  matchColumns: Record<string, string>  // e.g. { client_id: 'abc', week_start: '2026-05-11' }
  debounceMs?: number                   // default 1500ms
  onSaveSuccess?: () => void
  onSaveError?: (err: string) => void
  saveFn?: (payload: Record<string, any>) => Promise<void> // Custom save logic (e.g. RPC)
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutoSave(options: AutoSaveOptions) {
  const {
    table,
    matchColumns,
    debounceMs = 1500,
    onSaveSuccess,
    onSaveError,
    saveFn
  } = options

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [pendingData, setPendingData] = useState<Record<string, any> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const pendingAfterSave = useRef<Record<string, any> | null>(null)

  // Reset save status when match columns change
  useEffect(() => {
    setSaveStatus('idle')
    setLastSaved(null)
  }, [JSON.stringify(matchColumns)])

  const save = useCallback(async (data: Record<string, any>) => {
    // Guard: Ensure all matchColumns have values (not empty, undefined or null)
    const hasMissingKeys = Object.entries(matchColumns).some(([key, val]) => !val)
    if (hasMissingKeys) {
      console.warn('Auto-save skipped: missing match column values', matchColumns)
      return
    }

    // If currently saving, queue the latest data for after
    if (isSavingRef.current) {
      pendingAfterSave.current = data
      return
    }

    isSavingRef.current = true
    setSaveStatus('saving')

    try {
      const payload: Record<string, any> = {
        ...matchColumns,
        ...data,
      }

      if (saveFn) {
        await saveFn(payload)
      } else {
        // Use upsert with onConflict for atomicity
        const { error } = await (supabase as any)
          .from(table)
          .upsert(payload, {
            onConflict: Object.keys(matchColumns).join(','),
            ignoreDuplicates: false  // always update
          })

        if (error) throw error
      }

      setSaveStatus('saved')
      setLastSaved(new Date())
      setPendingData(null)
      onSaveSuccess?.()

    } catch (err: any) {
      setSaveStatus('error')
      onSaveError?.(err.message)
      console.error('Auto-save failed:', err)
    } finally {
      isSavingRef.current = false

      // If data changed while we were saving, save again immediately
      if (pendingAfterSave.current) {
        const next = pendingAfterSave.current
        pendingAfterSave.current = null
        setTimeout(() => save(next), 100)
      }
    }
  }, [table, matchColumns, onSaveSuccess, onSaveError])

  // Debounced trigger — call this whenever form data changes
  const triggerSave = useCallback((data: Record<string, any>) => {
    setPendingData(data)
    setSaveStatus('saving') // show saving indicator immediately

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      save(data)
    }, debounceMs)
  }, [save, debounceMs])

  // Force immediate save (on blur, tab change, page unload)
  const saveNow = useCallback((data: Record<string, any>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    save(data)
  }, [save])

  // Cancel any pending auto-save timer
  const cancelPendingAutoSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Save on page unload — uses fetch with keepalive (supports auth headers, unlike sendBeacon)
  useEffect(() => {
    const handleUnload = () => {
      if (!pendingData || !_cachedAccessToken) return
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}`
      const payload = JSON.stringify({
        ...matchColumns,
        ...pendingData,
        updated_at: new Date().toISOString()
      })
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${_cachedAccessToken}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: payload,
        keepalive: true,
      })
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [pendingData, table, matchColumns])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { triggerSave, saveNow, saveStatus, lastSaved, cancelPendingAutoSave }
}
