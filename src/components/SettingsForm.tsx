import { useState, useEffect, FormEvent } from 'react'
import { useDatabase } from '../hooks/useDatabase'
import './SettingsForm.css'

// Define the relay type
interface RelayObject {
  key: string;
  value: string;
}

export function SettingsForm() {
  const { data, relays, error, updateSetting, addRelay, removeRelay } = useDatabase()
  const [newRelayUrl, setNewRelayUrl] = useState('')
  const [newSettingKey, setNewSettingKey] = useState('')
  const [newSettingValue, setNewSettingValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Log current data for debugging
    console.log('Current settings data:', data)
    console.log('Current relays:', relays)
    
    // Set loading to false once we have data
    if (Object.keys(data).length > 0 || relays.length > 0) {
      setIsLoading(false)
    }
  }, [data, relays])

  // Add a function to handle form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    console.log('Input changed:', name, value)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      
      // Convert FormData to array of entries
      const entries: [string, FormDataEntryValue][] = []
      formData.forEach((value, key) => {
        // Convert the value to a string to avoid [object Object] issues
        const stringValue = String(value)
        entries.push([key, stringValue])
      })
      
      for (const [key, value] of entries) {
        if (key !== 'newRelayUrl' && key !== 'newSettingKey' && key !== 'newSettingValue') {
          await updateSetting(key, value)
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddSetting = async () => {
    if (!newSettingKey || !newSettingValue) return
    
    setIsSaving(true)
    try {
      await updateSetting(newSettingKey, newSettingValue)
      setNewSettingKey('')
      setNewSettingValue('')
    } catch (error) {
      console.error('Error adding setting:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddRelay = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newRelayUrl) return
    
    setIsSaving(true)
    try {
      await addRelay(newRelayUrl)
      setNewRelayUrl('')
    } catch (error) {
      console.error('Error adding relay:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveRelay = async (key: string) => {
    setIsSaving(true)
    try {
      await removeRelay(key)
    } catch (error) {
      console.error('Error removing relay:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveSetting = async (key: string) => {
    setIsSaving(true)
    try {
      await updateSetting(key, null)
    } catch (error) {
      console.error('Error removing setting:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to safely get relay key and value
  const getRelayInfo = (relay: string | RelayObject): { key: string, value: string } => {
    if (typeof relay === 'string') {
      return { key: relay, value: relay };
    } else {
      return { 
        key: (relay as RelayObject).key || '', 
        value: (relay as RelayObject).value || '' 
      };
    }
  };

  return (
    <div className="settings-form-container">
      <h2>Settings</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="loading-indicator">Loading settings...</div>
      ) : (
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-section">
            <h3>General Settings</h3>
            
            {/* Add new setting form */}
            <div className="add-setting-form">
              <div className="setting-input-group">
                <input
                  type="text"
                  value={newSettingKey}
                  onChange={(e) => setNewSettingKey(e.target.value)}
                  placeholder="Setting key"
                  disabled={isSaving}
                />
                <input
                  type="text"
                  value={newSettingValue}
                  onChange={(e) => setNewSettingValue(e.target.value)}
                  placeholder="Setting value"
                  disabled={isSaving}
                />
                <button 
                  type="button" 
                  onClick={handleAddSetting}
                  disabled={isSaving || !newSettingKey || !newSettingValue}
                >
                  Add Setting
                </button>
              </div>
            </div>
            
            {Object.entries(data).length > 0 ? (
              Object.entries(data).map(([key, value]) => (
                <div key={key} className="setting-item">
                  <label htmlFor={key}>{key}</label>
                  <div className="setting-input-group">
                    <input
                      type="text"
                      id={key}
                      name={key}
                      defaultValue={value}
                      disabled={isSaving}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSetting(key)}
                      disabled={isSaving}
                      className="remove-button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No settings configured. Add a setting to get started.</p>
            )}
          </div>

          <div className="settings-section">
            <h3>Relays</h3>
            {/* Changed from form to div to avoid nested forms */}
            <div className="add-relay-form">
              <div className="setting-input-group">
                <input
                  type="text"
                  value={newRelayUrl}
                  onChange={(e) => setNewRelayUrl(e.target.value)}
                  placeholder="Enter relay URL"
                  disabled={isSaving}
                />
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (newRelayUrl) {
                      handleAddRelay(e as unknown as FormEvent<HTMLFormElement>);
                    }
                  }}
                  disabled={isSaving || !newRelayUrl}
                >
                  Add Relay
                </button>
              </div>
            </div>

            {relays.length > 0 ? (
              <ul className="relay-list">
                {relays.map((relay) => {
                  const { key, value } = getRelayInfo(relay);
                  
                  return (
                    <li key={key} className="relay-item">
                      <span>{value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRelay(key)}
                        disabled={isSaving}
                        className="remove-button"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No relays configured. Add a relay to get started.</p>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
