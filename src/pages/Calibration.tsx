import React, { useState, useEffect } from 'react'
import { CR80_WIDTH_MM, CR80_HEIGHT_MM, SLOT1_X_MM, SLOT1_Y_MM, SLOT2_Y_MM } from '../utils/units'

interface Profile {
  id?: number
  name: string
  offsetX: number
  offsetY: number
  slot2YOffset: number
  scaleX: number
  scaleY: number
  isDefault: number
}

const Calibration: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [wizardStep, setWizardStep] = useState(1)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    const data = await window.ipcRenderer.invoke('get-profiles')
    if (data.length > 0) {
      setSelectedProfile(data.find((p: Profile) => p.isDefault) || data[0])
    }
  }

  const handleSave = async () => {
    if (selectedProfile) {
      await window.ipcRenderer.invoke('save-profile', selectedProfile)
      loadProfiles()
      alert('Profile saved')
    }
  }

  const updateProfile = (field: keyof Profile, value: any) => {
    if (selectedProfile) {
      setSelectedProfile({ ...selectedProfile, [field]: value })
    }
  }

  if (!selectedProfile) return <div>Loading...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Printer Calibration</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex gap-4 mb-6 border-b">
             <button onClick={() => setWizardStep(1)} className={`pb-2 font-bold text-sm uppercase tracking-wider ${wizardStep === 1 ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>1. Parameters</button>
             <button onClick={() => setWizardStep(2)} className={`pb-2 font-bold text-sm uppercase tracking-wider ${wizardStep === 2 ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>2. Wizard</button>
          </div>

          {wizardStep === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profile Name</label>
                <input
                  type="text"
                  value={selectedProfile.name}
                  onChange={(e) => updateProfile('name', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Offset X (mm)</label>
                  <input
                    type="number" step="0.1"
                    value={selectedProfile.offsetX}
                    onChange={(e) => updateProfile('offsetX', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Offset Y (mm)</label>
                  <input
                    type="number" step="0.1"
                    value={selectedProfile.offsetY}
                    onChange={(e) => updateProfile('offsetY', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slot 2 Y Correction (mm)</label>
                <input
                  type="number" step="0.1"
                  value={selectedProfile.slot2YOffset}
                  onChange={(e) => updateProfile('slot2YOffset', parseFloat(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scale X</label>
                  <input
                    type="number" step="0.001"
                    value={selectedProfile.scaleX}
                    onChange={(e) => updateProfile('scaleX', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scale Y</label>
                  <input
                    type="number" step="0.001"
                    value={selectedProfile.scaleY}
                    onChange={(e) => updateProfile('scaleY', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition mt-4 shadow-lg shadow-blue-200"
              >
                Save Profile
              </button>

              <button
                onClick={() => alert('Printing Test Sheet... (Simulated)')}
                className="w-full border-2 border-slate-200 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-50 transition mt-2"
              >
                Print Test Sheet
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded border border-amber-100">
                <h4 className="font-bold text-amber-800 text-sm mb-1">Step 1: Print Test</h4>
                <p className="text-xs text-amber-700">Print a 100mm x 100mm reference square from the design screen.</p>
              </div>

              <div className="p-4 bg-blue-50 rounded border border-blue-100">
                <h4 className="font-bold text-blue-800 text-sm mb-2">Step 2: Measure & Enter</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Measured Width (mm)</label>
                    <input
                      type="number" step="0.1" placeholder="e.g. 99.2"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (val > 0) updateProfile('scaleX', 100 / val)
                      }}
                      className="w-full border rounded p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Measured Height (mm)</label>
                    <input
                      type="number" step="0.1" placeholder="e.g. 100.5"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (val > 0) updateProfile('scaleY', 100 / val)
                      }}
                      className="w-full border rounded p-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="text-center p-4">
                 <p className="text-xs text-gray-500">Scale factors will update automatically as you type. Switch back to Parameters to save.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-4 self-start">Tray Preview</h2>
          <div className="relative border-2 border-gray-400 bg-white" style={{ width: 210, height: 297, scale: '1.5' }}>
            {/* Slot 1 */}
            <div
              className="absolute border border-blue-500 bg-blue-100 opacity-50"
              style={{
                left: SLOT1_X_MM + selectedProfile.offsetX,
                top: SLOT1_Y_MM + selectedProfile.offsetY,
                width: CR80_WIDTH_MM * selectedProfile.scaleX,
                height: CR80_HEIGHT_MM * selectedProfile.scaleY,
              }}
            />
            {/* Slot 2 */}
            <div
              className="absolute border border-red-500 bg-red-100 opacity-50"
              style={{
                left: SLOT1_X_MM + selectedProfile.offsetX,
                top: SLOT2_Y_MM + selectedProfile.offsetY + selectedProfile.slot2YOffset,
                width: CR80_WIDTH_MM * selectedProfile.scaleX,
                height: CR80_HEIGHT_MM * selectedProfile.scaleY,
              }}
            />
          </div>
          <p className="mt-4 text-xs text-gray-500 text-center">Visual representation of anchors with offsets applied.</p>
        </div>
      </div>
    </div>
  )
}

export default Calibration
