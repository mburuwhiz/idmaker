import * as XLSX from 'xlsx'

export async function parseExcel(filePath: string) {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet)
  return data
}

export function validateStudentData(student: any, requiredFields: string[]) {
  const missing = requiredFields.filter(field => !student[field])
  return {
    isValid: missing.length === 0,
    missingFields: missing
  }
}

export function generateExceptionReport(failedStudents: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(failedStudents.map(s => ({
    Name: s.data.NAME,
    ADM_NO: s.admNo,
    Reason: s.exceptionReason
  })))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Failed Cards")

  XLSX.writeFile(workbook, `Exception_Report_${new Date().getTime()}.xlsx`)
}
