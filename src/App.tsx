import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Calibration from './pages/Calibration'
import StudentData from './pages/StudentData'
import Design from './pages/Design'
import Batches from './pages/Batches'
import Print from './pages/Print'

const Settings = () => <div className="p-6"><h1 className="text-3xl font-bold">Application Settings</h1></div>

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
