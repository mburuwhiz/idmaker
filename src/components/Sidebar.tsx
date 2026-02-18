import React, { useState } from 'react'
import { Layout, Database, Clock, Printer, Settings2, Settings, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    { id: 'layouts', label: 'Library', icon: Layout },
    { id: 'design', label: 'Designer', icon: Pencil },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'batches', label: 'Batches', icon: Clock },
    { id: 'print', label: 'Print', icon: Printer },
    { id: 'calibration', label: 'Calibration', icon: Settings2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 h-screen text-white flex flex-col transition-all duration-300 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-blue-600 rounded-full p-1 border-2 border-slate-900 hover:bg-blue-500 transition-colors z-50 shadow-lg shadow-blue-900/50"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`p-6 overflow-hidden ${isCollapsed ? 'px-4 text-center' : ''}`}>
        <h1 className={`font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent transition-all ${isCollapsed ? 'text-lg' : 'text-xl'}`}>
          {isCollapsed ? 'WP' : 'WhizPoint ID'}
        </h1>
        {!isCollapsed && <p className="text-xs text-slate-400 mt-1">Professional ID Production</p>}
      </div>

      <nav className="flex-1 mt-4 overflow-x-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={isCollapsed ? item.label : ''}
            className={`w-full flex items-center gap-3 py-4 transition-colors ${isCollapsed ? 'justify-center px-4' : 'px-6'} ${
              activeTab === item.id
                ? 'bg-blue-600 text-white border-r-4 border-blue-300'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className={`p-6 border-t border-slate-800 text-xs text-slate-500 ${isCollapsed ? 'text-center px-2' : ''}`}>
        {isCollapsed ? 'v1' : 'v1.0.0'}
      </div>
    </div>
  )
}

export default Sidebar
