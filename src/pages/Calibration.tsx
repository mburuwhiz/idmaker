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
          <h2 className="text-xl font-semibold mb-4">Parameters (mm)</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Name</label>
              <input
                type="text"
                value={selectedProfile.name}
                onChange={(e) => updateProfile('name', e.target.value)}
                className="mt-1 block w-full border rounded-md px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Offset X</label>
                <input
                  type="number" step="0.1"
                  value={selectedProfile.offsetX}
                  onChange={(e) => updateProfile('offsetX', parseFloat(e.target.value))}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Offset Y</label>
                <input
                  type="number" step="0.1"
                  value={selectedProfile.offsetY}
                  onChange={(e) => updateProfile('offsetY', parseFloat(e.target.value))}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Slot 2 Y Offset Correction</label>
              <input
                type="number" step="0.1"
                value={selectedProfile.slot2YOffset}
                onChange={(e) => updateProfile('slot2YOffset', parseFloat(e.target.value))}
                className="mt-1 block w-full border rounded-md px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Scale X</label>
                <input
                  type="number" step="0.001"
                  value={selectedProfile.scaleX}
                  onChange={(e) => updateProfile('scaleX', parseFloat(e.target.value))}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Scale Y</label>
                <input
                  type="number" step="0.001"
                  value={selectedProfile.scaleY}
                  onChange={(e) => updateProfile('scaleY', parseFloat(e.target.value))}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Save Profile
            </button>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium mb-2 text-blue-800">Calibration Wizard</h3>
            <p className="text-sm text-gray-600 mb-4">Enter measured values from a 100mm test print to auto-calculate scale.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Actual Width (mm)</label>
                <input
                  type="number" step="0.1" placeholder="Expected 100"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (val > 0) updateProfile('scaleX', 100 / val)
                  }}
                  className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Actual Height (mm)</label>
                <input
                  type="number" step="0.1" placeholder="Expected 100"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (val > 0) updateProfile('scaleY', 100 / val)
                  }}
                  className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
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
