import type { DayEntry } from '../types'
import {
  GDRIVE_LAST_BACKUP,
  GDRIVE_TOKEN_KEY,
  ls,
  getGDriveToken,
  clearGDriveToken,
  saveGDriveToken,
  loadEntries,
} from './storage'
import { REDIRECT_URI } from './utils'

export { REDIRECT_URI }
export const GDRIVE_CLIENT_ID   = '841458188245-8rdmltdj4acjb0c4fisrf44vmedovuc3.apps.googleusercontent.com'
export const GDRIVE_SCOPE       = 'https://www.googleapis.com/auth/drive.file'
export const BACKUP_INTERVAL_DAYS = 7

export function startGDriveAuth(): void {
  const params = new URLSearchParams({
    client_id:     GDRIVE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'token',
    scope:         GDRIVE_SCOPE,
    state:         'gdrive_auth',
    prompt:        'consent',
  })
  window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString()
}

async function findOrCreateFolder(token: string): Promise<string> {
  const q = encodeURIComponent("name='Nourish Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false")
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: 'Bearer ' + token },
  })
  if (search.status === 401) { clearGDriveToken(); throw new Error('Google session expired — please reconnect') }
  const data = await search.json() as { files?: Array<{ id?: string }> }
  if (data.files?.length) return data.files[0]?.id ?? ''
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nourish Backups', mimeType: 'application/vnd.google-apps.folder' }),
  })
  if (!create.ok) throw new Error('Could not create Nourish Backups folder: ' + create.status)
  const folder = await create.json() as { id?: string }
  return folder.id ?? ''
}

export async function backupToDrive(entries: Record<string, DayEntry>): Promise<string> {
  const tokenData = getGDriveToken()
  if (!tokenData?.access_token) throw new Error('Not connected to Google Drive')
  if (tokenData.expires_at && Date.now() > tokenData.expires_at - 60000) {
    clearGDriveToken()
    throw new Error('Google session expired — please reconnect in Settings')
  }
  const token    = tokenData.access_token
  const folderId = await findOrCreateFolder(token)
  const date     = new Date().toISOString().split('T')[0] as string
  const filename = `nourish-backup-${date}.json`
  const content  = JSON.stringify({ exportedAt: new Date().toISOString(), entries }, null, 2)

  const boundary = 'nourish_bnd_' + Math.random().toString(36).slice(2)
  const body = [
    `--${boundary}\r\n`,
    `Content-Type: application/json\r\n\r\n`,
    JSON.stringify({ name: filename, parents: [folderId] }) + '\r\n',
    `--${boundary}\r\n`,
    `Content-Type: application/json\r\n\r\n`,
    content + '\r\n',
    `--${boundary}--`,
  ].join('')

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (res.status === 401) { clearGDriveToken(); throw new Error('Google session expired — please reconnect') }
  if (!res.ok) throw new Error(`Backup failed (HTTP ${res.status})`)
  ls.setStr(GDRIVE_LAST_BACKUP, new Date().toISOString())
  return filename
}

export function shouldAutoBackup(): boolean {
  const last = ls.str(GDRIVE_LAST_BACKUP)
  if (!last) return true
  const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= BACKUP_INTERVAL_DAYS
}

// Re-export for App's OAuth callback and auto-backup
export { GDRIVE_TOKEN_KEY, ls, saveGDriveToken, loadEntries }
