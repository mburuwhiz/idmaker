import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Calibration from './pages/Calibration'
import StudentData from './pages/StudentData'
import Design from './pages/Design'
import Batches from './pages/Batches'
import Print from './pages/Print'

const Settings = () => (
  <div className="p-6 max-w-2xl">
    <h1 className="text-3xl font-bold mb-6">Settings</h1>
    <div className="bg-white rounded-xl border p-6 space-y-6 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">General</h3>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span className="text-sm">Measurement Units</span>
          <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded">Millimeters (Locked)</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">About</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          WhizPoint ID is a high-precision card production system designed for Epson tray alignment.
          Built by Whizpoint Solutions.
        </p>
        <div className="mt-4 text-[10px] text-gray-400">Version 1.0.0-Stable</div>
      </div>
    </div>
  </div>
)

function App() {
  const [activeTab, setActiveTab] = useState('design')

  const renderContent = () => {
    switch (activeTab) {
      case 'design': return <Design />
      case 'data': return <StudentData />
      case 'batches': return <Batches />
      case 'print': return <Print />
      case 'calibration': return <Calibration />
      case 'settings': return <Settings />
      default: return <Design />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
