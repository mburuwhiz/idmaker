import React, { useState, useEffect } from 'react'
import { Search, Edit, CheckCircle, AlertCircle, Save, X } from 'lucide-react'

interface Student {
  id: number
  admNo: string
  data: any
  photoPath?: string
  printStatus: string
}

const StudentData: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<string>('')

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    const data = await window.ipcRenderer.invoke('get-students', null) // Fetching all for now
    setStudents(data.map((s: any) => ({ ...s, data: JSON.parse(s.data) })))
  }

  const startEdit = (student: Student) => {
    setEditingId(student.id)
    setEditData(JSON.stringify(student.data, null, 2))
  }

  const saveEdit = async () => {
    if (editingId === null) return
    try {
      const parsedData = JSON.parse(editData)
      await window.ipcRenderer.invoke('update-student', editingId, parsedData, 'pending')
      setEditingId(null)
      loadStudents()
    } catch (e) {
      alert('Invalid JSON data')
    }
  }

  const filteredStudents = students.filter(s =>
    s.admNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.data.NAME || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Student Records</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or ADM NO..."
            className="pl-10 pr-4 py-2 border rounded-lg w-80 focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-4 font-semibold text-gray-700">ADM NO</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Name</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Photo</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-mono">{student.admNo}</td>
                <td className="px-6 py-4">
                  {editingId === student.id ? (
                    <textarea
                      value={editData}
                      onChange={(e) => setEditData(e.target.value)}
                      className="w-full border rounded p-1 text-xs font-mono h-24"
                    />
                  ) : (
                    <span>{student.data.NAME || 'N/A'}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {student.photoPath ? (
                    <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded">Linked</span>
                  ) : (
                    <span className="text-red-500 text-xs font-medium bg-red-50 px-2 py-1 rounded">Missing</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {student.printStatus === 'printed' ? (
                    <span className="flex items-center text-green-600 gap-1"><CheckCircle size={16} /> Printed</span>
                  ) : (
                    <span className="flex items-center text-amber-600 gap-1"><AlertCircle size={16} /> Pending</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId === student.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={saveEdit} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Save size={18} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(student)} className="p-2 hover:bg-gray-200 rounded-full text-blue-600 transition">
                      <Edit size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default StudentData
