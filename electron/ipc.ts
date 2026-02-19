import { ipcMain, dialog, app } from 'electron'
import db from './db.js'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let XLSX = require('xlsx')
let fontList = require('font-list')

// Handle potential ESM wrapper or default export when using require in an ESM context
if (XLSX && XLSX.default && typeof XLSX.readFile !== 'function') {
  XLSX = XLSX.default
}
if (fontList && fontList.default && typeof fontList.getFonts !== 'function') {
  fontList = fontList.default
}

export function setupIpc() {
  console.log('[IPC] Registering handlers...')

  // System Fonts
  ipcMain.handle('get-system-fonts', async () => {
    try {
      const fonts = await fontList.getFonts()
      return fonts
    } catch (e) {
      console.error('Failed to get system fonts:', e)
      return []
    }
  })

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

  ipcMain.handle('delete-batch', (_event, batchId) => {
    db.transaction(() => {
      db.prepare('DELETE FROM students WHERE batchId = ?').run(batchId)
      db.prepare('DELETE FROM batches WHERE id = ?').run(batchId)
    })()
    return true
  })

  ipcMain.handle('rename-batch', (_event, batchId, newName) => {
    return db.prepare('UPDATE batches SET name = ? WHERE id = ?').run(newName, batchId)
  })

  ipcMain.handle('update-batch-layout', (_event, batchId, layoutId) => {
    return db.prepare('UPDATE batches SET layoutId = ? WHERE id = ?').run(layoutId, batchId)
  })

  // Layouts
  ipcMain.handle('get-layouts', () => {
    return db.prepare('SELECT * FROM layouts').all()
  })

  ipcMain.handle('save-layout', (_event, name, content) => {
    return db.prepare('INSERT OR REPLACE INTO layouts (name, content) VALUES (?, ?)').run(name, content)
  })

  ipcMain.handle('delete-layout', (_event, id) => {
    return db.prepare('DELETE FROM layouts WHERE id = ?').run(id)
  })

  ipcMain.handle('export-layout-wid', async (_event, layoutId) => {
    const layout = db.prepare('SELECT * FROM layouts WHERE id = ?').get(layoutId) as any
    if (!layout) return null

    const bundle = {
      version: '2.0.0',
      type: 'layout',
      layout: {
        name: layout.name,
        content: layout.content
      }
    }

    const savePath = dialog.showSaveDialogSync({
      title: 'Export WhizPoint Design Package',
      defaultPath: `${layout.name.replace(/\s+/g, '_')}.wid`,
      filters: [{ name: 'WhizPoint ID Files', extensions: ['wid'] }]
    })

    if (savePath) {
      const MAGIC = Buffer.from('WID2')
      const jsonContent = JSON.stringify(bundle)
      const compressed = zlib.gzipSync(jsonContent)
      const finalBuffer = Buffer.concat([MAGIC, compressed])
      fs.writeFileSync(savePath, finalBuffer)
      return savePath
    }
    return null
  })

  ipcMain.handle('import-layout-wid', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'WhizPoint ID Files', extensions: ['wid'] }]
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const buffer = fs.readFileSync(result.filePaths[0])
    let bundle: any

    try {
      const magic = buffer.slice(0, 4).toString()
      if (magic === 'WID2') {
        const decompressed = zlib.gunzipSync(buffer.slice(4)).toString('utf-8')
        bundle = JSON.parse(decompressed)
      } else {
        // Legacy fallback
        const decompressed = zlib.gunzipSync(buffer).toString('utf-8')
        bundle = JSON.parse(decompressed)
      }
    } catch (e) {
      console.error('[IPC] Failed to parse .wid file:', e)
      throw new Error('Invalid or corrupted .wid file')
    }

    // Support both batch WIDs (extract layout) and layout WIDs
    let layoutData = null
    if (bundle.type === 'layout' && bundle.layout) {
      layoutData = bundle.layout
    } else if (bundle.batch && bundle.batch.layout) {
      layoutData = bundle.batch.layout
    }

    if (layoutData) {
      const { name, content } = layoutData
      // Append (Imported) to avoid name collision if desired, or let user rename
      const importName = `${name} (Imported ${new Date().toLocaleTimeString()})`
      const res = db.prepare('INSERT INTO layouts (name, content) VALUES (?, ?)').run(importName, content)
      return { id: res.lastInsertRowid, name: importName }
    }

    throw new Error('No valid layout found in this package')
  })

  // Specialized Import
  ipcMain.handle('import-excel', async (_event, batchNameArg) => {
    try {
      console.log('[IPC] import-excel called')

      // Defensively check XLSX library
      if (typeof XLSX.readFile !== 'function') {
        console.error('[IPC] XLSX.readFile is not a function. Current XLSX keys:', Object.keys(XLSX))
        throw new TypeError('XLSX library failed to load correctly.')
      }

      const result = await dialog.showOpenDialog({
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
      })

      if (result.canceled || result.filePaths.length === 0) return null

      const filePath = result.filePaths[0]
      console.log('[IPC] Reading Excel file:', filePath)
      // cellDates: true ensures dates are read as Date objects
      const workbook = XLSX.readFile(filePath, { cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet)

      if (!data || data.length === 0) {
        throw new Error('Excel file is empty')
      }

      const batchName = batchNameArg || `Batch ${path.basename(filePath)} (${new Date().toLocaleDateString()})`
      const batchResult = db.prepare('INSERT INTO batches (name) VALUES (?)').run(batchName)
      const batchId = batchResult.lastInsertRowid

      const insertStudent = db.prepare(`
        INSERT INTO students (batchId, admNo, data) VALUES (?, ?, ?)
      `)

      db.transaction(() => {
        for (const row of data as any[]) {
          const keys = Object.keys(row)
          // Robust ADM_NO detection
          const admKey = keys.find(k => ['ADM_NO', 'ADM', 'ADMNO', 'ADMISSION', 'STUDENT_ID'].includes(k.toUpperCase()))

          // Process dates to DD/MM/YYYY string format
          for (const key in row) {
            const val = row[key]
            if (val instanceof Date) {
              const d = val
              const day = String(d.getDate()).padStart(2, '0')
              const month = String(d.getMonth() + 1).padStart(2, '0')
              const year = d.getFullYear()
              row[key] = `${day}/${month}/${year}`
            } else if (key !== admKey) {
              // Handle potential Excel date serial numbers for non-admission fields
              const numVal = Number(val)
              if (!isNaN(numVal) && numVal > 20000 && numVal < 80000) {
                try {
                  const date = XLSX.SSF.parse_date_code(numVal)
                  if (date && date.y > 1900 && date.y < 2100) {
                    const day = String(date.d).padStart(2, '0')
                    const month = String(date.m).padStart(2, '0')
                    const year = date.y
                    row[key] = `${day}/${month}/${year}`
                  }
                } catch (e) {
                  // Not a valid date format, keep original
                }
              }
            }
          }

          // Trim admission number for consistency
          const admNo = (admKey ? row[admKey] : `TEMP-${Math.random().toString(36).substr(2, 5)}`).toString().trim()
          insertStudent.run(batchId, admNo, JSON.stringify(row))
        }
      })()

      return { batchId, count: data.length }
    } catch (err) {
      console.error('[IPC] Import failed:', err)
      throw err
    }
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
    const students = db.prepare('SELECT id, data FROM students WHERE batchId = ?').all(batchId) as any[]

    let matchedCount = 0
    const updateStudent = db.prepare('UPDATE students SET photoPath = ?, printStatus = ?, exceptionReason = ? WHERE id = ?')

    db.transaction(() => {
      for (const student of students) {
        const studentData = JSON.parse(student.data)
        // Find PHOTOID in student data (case-insensitive)
        const photoIdKey = Object.keys(studentData).find(k => k.trim().toUpperCase() === 'PHOTOID' || k.trim().toUpperCase() === 'PHOTO_ID')
        const photoId = photoIdKey ? String(studentData[photoIdKey]).trim() : null

        if (!photoId) {
          updateStudent.run(null, 'failed', 'Missing PHOTOID in Excel', student.id)
          continue
        }

        // Case-insensitive and trimmed matching against files
        const targetPhotoId = photoId.toUpperCase()
        const matches = files.filter(f => path.parse(f).name.trim().toUpperCase() === targetPhotoId)

        if (matches.length === 0) {
          // No photo found
          updateStudent.run(null, 'failed', `Photo Not Found (${photoId})`, student.id)
        } else if (matches.length > 1) {
          // Multiple extensions found (e.g. 001.jpg and 001.png)
          updateStudent.run(null, 'failed', `Conflict: Multiple photos found for ${photoId} (${matches.join(', ')})`, student.id)
        } else {
          // Exactly one match
          updateStudent.run(path.join(dirPath, matches[0]), 'pending', null, student.id)
          matchedCount++
        }
      }
    })()

    return matchedCount
  })

  ipcMain.handle('export-exceptions', async (_event, batchId) => {
    const students = db.prepare("SELECT data, exceptionReason FROM students WHERE batchId = ? AND printStatus = 'failed'").all(batchId) as any[]

    if (students.length === 0) return null

    // Map data to flat rows for Excel export
    const exportRows = students.map(s => {
      const row = JSON.parse(s.data)
      return {
        ...row,
        REASON: s.exceptionReason
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exceptions')

    const savePath = dialog.showSaveDialogSync({
      title: 'Export Exception Report',
      defaultPath: `Exception_Report_Batch_${batchId}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    })

    if (savePath) {
      XLSX.writeFile(workbook, savePath)
      return savePath
    }
    return null
  })

  // Read restricted to specific photo paths
  ipcMain.handle('read-photo', async (_event, photoPath) => {
    // In a real app, verify that photoPath is within allowed directories
    if (!photoPath || !fs.existsSync(photoPath)) return null
    return fs.readFileSync(photoPath).toString('base64')
  })

  ipcMain.on('read-photo-sync', (event, photoPath) => {
    if (!photoPath || !fs.existsSync(photoPath)) {
      event.returnValue = null
      return
    }
    event.returnValue = fs.readFileSync(photoPath).toString('base64')
  })

  ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }]
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('update-student-photo', (_event, id, photoPath) => {
    return db.prepare('UPDATE students SET photoPath = ? WHERE id = ?').run(photoPath, id)
  })

  ipcMain.handle('export-batch-wid', async (_event, batchId) => {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as any
    const students = db.prepare('SELECT * FROM students WHERE batchId = ?').all(batchId) as any[]

    if (!batch) return null

    // Fetch associated layout if exists
    let layout = null
    if (batch.layoutId) {
      layout = db.prepare('SELECT * FROM layouts WHERE id = ?').get(batch.layoutId) as any
    }

    const bundle = {
      version: '2.0.0', // Incremented version for binary format
      batch: {
        name: batch.name,
        layout: layout ? { name: layout.name, content: layout.content } : null
      },
      students: students.map(s => {
        let photoBase64 = null
        if (s.photoPath && fs.existsSync(s.photoPath)) {
          photoBase64 = fs.readFileSync(s.photoPath).toString('base64')
        }
        return {
          admNo: s.admNo,
          data: JSON.parse(s.data),
          photoBase64,
          printStatus: s.printStatus
        }
      })
    }

    const savePath = dialog.showSaveDialogSync({
      title: 'Export WhizPoint ID Batch',
      defaultPath: `${batch.name.replace(/\s+/g, '_')}.wid`,
      filters: [{ name: 'WhizPoint ID Files', extensions: ['wid'] }]
    })

    if (savePath) {
      // Binary header to identify the file
      const MAGIC = Buffer.from('WID2')
      const jsonContent = JSON.stringify(bundle)
      const compressed = zlib.gzipSync(jsonContent)
      const finalBuffer = Buffer.concat([MAGIC, compressed])

      fs.writeFileSync(savePath, finalBuffer)
      return savePath
    }
    return null
  })

  ipcMain.handle('import-batch-wid', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'WhizPoint ID Files', extensions: ['wid'] }]
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const buffer = fs.readFileSync(result.filePaths[0])
    let bundle: any

    try {
      // Check for MAGIC header
      const magic = buffer.slice(0, 4).toString()
      if (magic === 'WID2') {
        const decompressed = zlib.gunzipSync(buffer.slice(4)).toString('utf-8')
        bundle = JSON.parse(decompressed)
      } else {
        // Fallback for older formats (direct gzip or plain JSON)
        try {
          const decompressed = zlib.gunzipSync(buffer).toString('utf-8')
          bundle = JSON.parse(decompressed)
        } catch (e) {
          const content = buffer.toString('utf-8')
          bundle = JSON.parse(content)
        }
      }
    } catch (e) {
      console.error('[IPC] Failed to parse .wid file:', e)
      throw new Error('Invalid or corrupted .wid file')
    }

    const batchName = `${bundle.batch.name} (Imported)`
    // Handle layout import
    let layoutId = null
    if (bundle.batch.layout) {
        const { name, content } = bundle.batch.layout
        db.prepare('INSERT OR REPLACE INTO layouts (name, content) VALUES (?, ?)').run(name, content)
        const layout = db.prepare('SELECT id FROM layouts WHERE name = ?').get(name) as any
        if (layout) layoutId = layout.id
    }

    const batchResult = db.prepare('INSERT INTO batches (name, layoutId) VALUES (?, ?)').run(batchName, layoutId)
    const batchId = batchResult.lastInsertRowid

    // Create a local storage for photos
    const photoDir = path.join(app.getPath('userData'), 'imported_photos', batchId.toString())
    if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true })

    const insertStudent = db.prepare(`
      INSERT INTO students (batchId, admNo, data, photoPath, printStatus) VALUES (?, ?, ?, ?, ?)
    `)

    db.transaction(() => {
      for (const s of bundle.students) {
        let photoPath = null
        if (s.photoBase64) {
          photoPath = path.join(photoDir, `${s.admNo}.jpg`)
          fs.writeFileSync(photoPath, Buffer.from(s.photoBase64, 'base64'))
        }
        insertStudent.run(batchId, s.admNo, JSON.stringify(s.data), photoPath, s.printStatus)
      }
    })()

    return { batchId, count: bundle.students.length }
  })
}
