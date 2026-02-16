import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Calibration from './pages/Calibration'
import StudentData from './pages/StudentData'
import Design from './pages/Design'
import Batches from './pages/Batches'
import Print from './pages/Print'

const Settings = () => {
  const [status, setStatus] = useState<string>('Unknown')

  const checkStatus = async () => {
    try {
      const res = await window.ipcRenderer.invoke('get-profiles')
      if (res) setStatus('Connected to Database')
      else setStatus('No Database response')
    } catch (e) {
      setStatus('Connection Failed: ' + (e as Error).message)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-xl border p-6 space-y-6 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">System Status</h3>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm font-medium">{status}</span>
            <button
              onClick={checkStatus}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded font-bold hover:bg-blue-700 transition"
            >
              Check Connection
            </button>
          </div>
        </div>
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
}

function App() {
  const [activeTab, setActiveTab] = useState('design')
  const [loading, setLoading] = useState(true)
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await window.ipcRenderer.invoke('get-profiles')
        setLoading(false)
      } catch (e) {
        console.warn('Waiting for backend...', e)
        setTimeout(checkConnection, 500)
      }
    }
    checkConnection()
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'design': return <Design />
      case 'data': return <StudentData initialBatchId={activeBatchId} />
      case 'batches': return (
        <Batches
          onViewData={(id) => { setActiveBatchId(id); setActiveTab('data'); }}
          onPrint={(id) => { setActiveBatchId(id); setActiveTab('print'); }}
        />
      )
      case 'print': return <Print initialBatchId={activeBatchId} />
      case 'calibration': return <Calibration />
      case 'settings': return <Settings />
      default: return <Design />
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">WhizPoint ID</h2>
        <p className="text-slate-500 text-sm mt-2">Initializing Production System...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      <Toaster position="top-right" />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
