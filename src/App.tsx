import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Calibration from './pages/Calibration'
import StudentData from './pages/StudentData'
import Design from './pages/Design'
import Layouts from './pages/Layouts'
import Batches from './pages/Batches'
import Print from './pages/Print'
import PreviewIndividual from './pages/PreviewIndividual'

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
  const [activeTab, setActiveTab] = useState('layouts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null)
  const [pendingLayout, setPendingLayout] = useState<any>(null)

  const checkConnection = async () => {
    if (!window.ipcRenderer) {
      setError("IPC Bridge not found. This application must be run inside Electron with its production shell.");
      // Retry automatically in case it's a race condition
      setTimeout(checkConnection, 1000)
      return;
    }

    try {
      await window.ipcRenderer.invoke('get-profiles')
      setLoading(false)
      setError(null)
    } catch (e) {
      console.warn('Waiting for backend...', e)
      setError((e as Error).message)
      // Retry automatically for a while
      setTimeout(checkConnection, 1000)
    }
  }

  useEffect(() => {
    checkConnection()

    // Show a timeout message if it takes more than 5 seconds
    const timer = setTimeout(() => {
      if (loading) {
        setError("Backend connection is taking longer than expected. Please wait or try restarting the application.")
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'layouts': return (
        <Layouts
          onLoadLayout={(layout) => {
            setPendingLayout(layout)
            setActiveTab('design')
          }}
          onNewLayout={() => {
            setPendingLayout({ isNew: true })
            setActiveTab('design')
          }}
        />
      )
      case 'design': return <Design pendingLayout={pendingLayout} clearPending={() => setPendingLayout(null)} />
      case 'data': return <StudentData initialBatchId={activeBatchId} />
      case 'batches': return (
        <Batches
          onViewData={(id) => { setActiveBatchId(id); setActiveTab('data'); }}
          onPrint={(id) => { setActiveBatchId(id); setActiveTab('print'); }}
          onPreview={(id) => { setActiveBatchId(id); setActiveTab('preview-individual'); }}
        />
      )
      case 'print': return <Print initialBatchId={activeBatchId} />
      case 'preview-individual': return activeBatchId ? <PreviewIndividual batchId={activeBatchId} onExit={() => setActiveTab('batches')} /> : <Design />
      case 'calibration': return <Calibration />
      case 'settings': return <Settings />
      default: return <Design />
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        {!error ? (
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        ) : (
          <div className="mb-6 text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
        )}
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">WhizPoint ID</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
          {error || "Initializing Production System..."}
        </p>
        {error && (
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-lg shadow-blue-900"
          >
            Restart Application
          </button>
        )}
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
