import { ipcMain, dialog } from 'electron'
import db from './db.js'
import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

export function setupIpc() {
  console.log('[IPC] Registering handlers...')

  // Profiles
  ipcMain.handle('get-profiles', () => {
    console.log('[IPC] get-profiles called')
    return db.prepare('SELECT * FROM printer_profiles').all()
  })

  ipcMain.handle('save-profile', (_event, profile) => {
    const { name, offsetX, offsetY, slot2YOffset, scaleX, scaleY, isDefault, id } = profile
    if (id) {
      return db.prepare(`
        UPDATE printer_profiles
        SET name = ?, offsetX = ?, offsetY = ?, slot2YOffset = ?, scaleX = ?, scaleY = ?, isDefault = ?
        WHERE id = ?
      `).run(name, offsetX, offsetY, slot2YOffset, scaleX, scaleY, isDefault, id)
    } else {
      return db.prepare(`
        INSERT INTO printer_profiles (name, offsetX, offsetY, slot2YOffset, scaleX, scaleY, isDefault)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, offsetX, offsetY, slot2YOffset, scaleX, scaleY, isDefault)
    }
  })

  // Batches & Students
  ipcMain.handle('get-batches', () => {
    return db.prepare('SELECT * FROM batches ORDER BY createdAt DESC').all()
  })

  ipcMain.handle('get-students', (_event, batchId) => {
    if (batchId) {
      return db.prepare('SELECT * FROM students WHERE batchId = ?').all(batchId)
    }
    return db.prepare('SELECT * FROM students').all()
  })

  ipcMain.handle('update-student', (_event, id, data, status) => {
    return db.prepare('UPDATE students SET data = ?, printStatus = ? WHERE id = ?').run(JSON.stringify(data), status, id)
  })

  // Layouts
  ipcMain.handle('get-layouts', () => {
    return db.prepare('SELECT * FROM layouts').all()
  })

  ipcMain.handle('save-layout', (_event, name, content) => {
    return db.prepare('INSERT INTO layouts (name, content) VALUES (?, ?)').run(name, content)
  })

  // Specialized Import
  ipcMain.handle('import-excel', async () => {
    console.log('[IPC] import-excel called')
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const workbook = XLSX.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet)

    if (data.length > 0) {
      console.log('[IPC] First row of imported data:', data[0])
    }

    const batchName = `Batch ${path.basename(filePath)} (${new Date().toLocaleDateString()})`
    const batchResult = db.prepare('INSERT INTO batches (name) VALUES (?)').run(batchName)
    const batchId = batchResult.lastInsertRowid

    const insertStudent = db.prepare(`
      INSERT INTO students (batchId, admNo, data) VALUES (?, ?, ?)
    `)

    console.log(`[IPC] Importing ${data.length} students into batch ${batchId}...`)

    db.transaction(() => {
      for (const row of data as any[]) {
        const admNo = row.ADM_NO || row.admNo || `TEMP-${Math.random()}`
        insertStudent.run(batchId, admNo.toString(), JSON.stringify(row))
      }
    })()

    return { batchId, count: data.length }
  })

  ipcMain.handle('open-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // File system restricted to photo matching
  ipcMain.handle('match-photos', async (_event, batchId, dirPath) => {
    if (!fs.existsSync(dirPath)) return 0
    const files = fs.readdirSync(dirPath)
    const students = db.prepare('SELECT id, admNo FROM students WHERE batchId = ?').all(batchId) as any[]

    let matchedCount = 0
    const updatePhoto = db.prepare('UPDATE students SET photoPath = ? WHERE id = ?')

    db.transaction(() => {
      for (const student of students) {
        const match = files.find(f => f.split('.')[0] === student.admNo)
        if (match) {
          updatePhoto.run(path.join(dirPath, match), student.id)
          matchedCount++
        }
      }
    })()

    return matchedCount
  })

  // Read restricted to specific photo paths
  ipcMain.handle('read-photo', async (_event, photoPath) => {
    // In a real app, verify that photoPath is within allowed directories
    if (!fs.existsSync(photoPath)) return null
    return fs.readFileSync(photoPath).toString('base64')
  })
}
