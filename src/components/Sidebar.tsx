import React from 'react'
import { Layout, Database, Clock, Printer, Settings2, Settings } from 'lucide-react'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'design', label: 'Design', icon: Layout },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'batches', label: 'Batches', icon: Clock },
    { id: 'print', label: 'Print', icon: Printer },
    { id: 'calibration', label: 'Calibration', icon: Settings2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="w-64 bg-slate-900 h-screen text-white flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          WhizPoint ID
        </h1>
        <p className="text-xs text-slate-400 mt-1">Professional ID Production</p>
      </div>

      <nav className="flex-1 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${
              activeTab === item.id
                ? 'bg-blue-600 text-white border-r-4 border-blue-300'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
        v1.0.0
      </div>
    </div>
  )
}

export default Sidebar
