import { useEffect, useState } from 'react'
import { DatabaseController }  from '@/backend/db/controller'
import { useMessageBus } from '@/hooks/useMessageBus'
import { RelayEntry } from '@/backend/db/controller.js'

// Define the relay type
interface RelayObject {
  key: string;
  value: string;
}

interface DatabaseState {
  settings: Record<string, any>
  relays: Array<{ key: string, value: string }>
  permissions: Array<{ key: string, value: { taskType: string, approved: boolean, remember: boolean } }>
}

interface DatabaseMessage {
  type: 'SETTINGS_DATA' | 'RELAYS_DATA' | 'PERMISSIONS_DATA' | 'ERROR' | 'SETTINGS_UPDATED'
  data?: Record<string, any> | RelayObject[] | Array<{ key: string, value: { taskType: string, approved: boolean, remember: boolean } }>
  message?: string
  key?: string
  value?: any
}

export function useDatabase() {
  const [data, setData] = useState<Record<string, any>>({})
  const [relays, setRelays] = useState<(string | RelayObject)[]>([])
  const [permissions, setPermissions] = useState<Array<{ key: string, value: { taskType: string, approved: boolean, remember: boolean } }>>([])
  const [error, setError] = useState<string | null>(null)
  const { send, onMessage } = useMessageBus()

  useEffect(() => {
    // Initial fetch
    send({ type: 'FETCH_SETTINGS' })
    send({ type: 'FETCH_RELAYS' })
    send({ type: 'FETCH_PERMISSIONS' })

    // Set up message listener
    const unsubscribe = onMessage((event: MessageEvent<DatabaseMessage>) => {
      const message = event.data
      console.log('Database received message:', message)

      switch (message.type) {
        case 'SETTINGS_DATA':
          // Only update if the data has actually changed
          const newSettingsStr = JSON.stringify(message.data)
          const currentSettingsStr = JSON.stringify(data)
          if (newSettingsStr !== currentSettingsStr) {
            console.log('Updating settings data:', message.data)
            setData(message.data as Record<string, any>)
          }
          break
        case 'SETTINGS_UPDATED':
          // Handle individual setting updates
          if (message.key !== undefined) {
            console.log('Updating individual setting:', message.key, message.value)
            setData(prevData => {
              const newData = { ...prevData }
              const key = message.key as string
              if (message.value === null) {
                // Remove the setting
                delete newData[key]
              } else {
                // Update the setting
                newData[key] = message.value
              }
              return newData
            })
          }
          break
        case 'RELAYS_DATA':
          console.log('Updating relays data:', message.data)
          setRelays(message.data as RelayObject[])
          break
        case 'PERMISSIONS_DATA':
          console.log('Updating permissions data:', message.data)
          setPermissions(message.data as Array<{ key: string, value: { taskType: string, approved: boolean, remember: boolean } }>)
          break
        case 'ERROR':
          console.error('Database error:', message.message)
          setError(message.message || 'An unknown error occurred')
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [send, onMessage, data])

  const updateSetting = async (key: string, value: any) => {
    try {
      send({ type: 'UPDATE_SETTINGS', key, value })
    } catch (error) {
      console.error('Error updating setting:', error)
      setError(`Failed to update setting: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const addRelay = async (url: string) => {
    try {
      send({ type: 'ADD_RELAY', url })
    } catch (error) {
      console.error('Error adding relay:', error)
      setError(`Failed to add relay: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const removeRelay = async (key: string) => {
    try {
      send({ type: 'REMOVE_RELAY', key })
    } catch (error) {
      console.error('Error removing relay:', error)
      setError(`Failed to remove relay: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    data,
    relays,
    permissions,
    error,
    updateSetting,
    addRelay,
    removeRelay
  }
}