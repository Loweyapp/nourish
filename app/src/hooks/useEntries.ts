import { useState } from 'react'
import type { DayEntry } from '../types'
import {
  loadEntries, saveEntries,
  FB_FETCH_KEY, FB_VERIFIER_KEY,
  ls,
  saveGDriveToken, isGDriveConnected, shouldAutoBackup, backupToDrive,
  exchangeCode, fetchFitbitDay, saveFitbitToken,
  today, seedDummyData,
} from '../lib'

export function useEntries() {
  const [entries, setEntries] = useState<Record<string, DayEntry>>(() => {
    seedDummyData()
    return loadEntries()
  })

  const updateEntry = (currentDay: string, data: DayEntry) => {
    const updated = { ...entries, [currentDay]: data }
    setEntries(updated)
    saveEntries(updated)
  }

  const handleOAuthCallback = () => {
    // Google Drive implicit flow — token in hash
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hash.get('access_token')
    const state = hash.get('state')
    if (accessToken && state === 'gdrive_auth') {
      const expiresIn = parseInt(hash.get('expires_in') ?? '3600')
      saveGDriveToken({ access_token: accessToken, expires_at: Date.now() + expiresIn * 1000 })
      window.history.replaceState({}, '', window.location.pathname)
      const currentEntries = loadEntries()
      backupToDrive(currentEntries).catch(() => {})
      return
    }
    // Fitbit auth code flow — token in query string
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const verifier = ls.str(FB_VERIFIER_KEY)
    if (code && verifier) {
      ls.del(FB_VERIFIER_KEY)
      window.history.replaceState({}, '', window.location.pathname)
      exchangeCode(code, verifier).then(tokenData => {
        saveFitbitToken({ ...tokenData, expires_at: Date.now() + tokenData.expires_in * 1000 })
        fetchFitbitDay().then(fitbit => {
          const td = today()
          const updated = { ...loadEntries(), [td]: { ...(loadEntries()[td] ?? {}), fitbit } }
          saveEntries(updated)
          setEntries(updated)
          ls.setStr(FB_FETCH_KEY, td)
        }).catch(() => {})
      }).catch(e => console.error('Token exchange failed:', e))
    }
  }

  const autoBackup = () => {
    if (!isGDriveConnected()) return
    if (!shouldAutoBackup()) return
    backupToDrive(loadEntries()).catch(() => {})
  }

  const autoSyncFitbit = (fitbitConnected: boolean) => {
    if (!fitbitConnected) return
    const lastFetch = ls.str(FB_FETCH_KEY)
    if (lastFetch === today()) return
    fetchFitbitDay().then(fitbit => {
      const td = today()
      setEntries(prev => {
        const updated = { ...prev, [td]: { ...(prev[td] ?? {}), fitbit } }
        saveEntries(updated)
        return updated
      })
      ls.setStr(FB_FETCH_KEY, td)
    }).catch(() => {})
  }

  return { entries, setEntries, updateEntry, handleOAuthCallback, autoBackup, autoSyncFitbit }
}
