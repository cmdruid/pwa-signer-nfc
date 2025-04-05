import { EventEmitter }       from '@/class/emitter.js'
import { DatabaseController } from '@/backend/db/controller.js'
import { Mutex }              from '@/backend/lock/mutex.js'

import * as CONST from '@/const.js'

import type { MessageType, PromptResponse } from '@/types/index.js'

export class BackgroundService {
  private readonly db : DatabaseController
  private readonly sw : ServiceWorkerGlobalScope
  private ws : WebSocket | null = null
  
  private readonly emitter = new EventEmitter<Record<string, any>>()
  private readonly mutex   = new Mutex()

  private lastSentMessage: string | null = null

  constructor(scope: ServiceWorkerGlobalScope) {
    this.db = DatabaseController.getInstance()
    this.sw = scope
    this.initializeWebSocket()
    console.log('BackgroundService initialized')
  }

  private async initializeWebSocket() {
    try {
      const relayUrl = await this.db.getFirstRelay()
      this.ws = new WebSocket(relayUrl)
      console.log('WebSocket initialized with relay:', relayUrl)
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
      // Fallback to default relay
      this.ws = new WebSocket(CONST.DEFAULT_RELAYS[0])
      console.log('WebSocket initialized with default relay:', CONST.DEFAULT_RELAYS[0])
    }
  }

  async processTask(task: any, requiresApproval: boolean): Promise<any> {
    console.log('Processing task:', task, 'requiresApproval:', requiresApproval)
    
    // If approval is required, check for stored permissions first
    if (requiresApproval) {
      // Extract task type from the task object
      const taskType = task.type || 'default'
      
      // Check if we have a stored permission for this task type
      const permission = await this.db.getPermission(taskType)
      
      if (permission) {
        console.log('Found stored permission for task type:', taskType, permission)
        
        // If we have a stored permission and it's set to remember, use it
        if (permission.remember) {
          console.log('Using stored permission:', permission.approved)
          return permission.approved ? this.executeTask(task) : null
        }
      }
      
      // If no stored permission or not set to remember, prompt the user
      const lock = await this.mutex.acquire()
      try {
        const promptId = crypto.randomUUID()
        console.log('Sending PROMPT with ID:', promptId)
        this.sendToFrontend({ type: 'PROMPT', promptId, task })
        
        return new Promise((resolve) => {
          this.emitter.once(`prompt-${promptId}`, (response: PromptResponse) => {
            console.log('Received prompt response:', response)
            
            // If the user wants to remember this preference, store it
            if (response.remember) {
              this.db.setPermission(taskType, response.approved, true)
                .catch(error => console.error('Failed to store permission:', error))
            }
            
            resolve(response.approved ? this.executeTask(task) : null)
          })
        })
      } finally {
        lock.release()
      }
    }
    return this.executeTask(task)
  }

  private async executeTask(task: any) {
    console.log('Executing task:', task)
    try {
      // If the task has a key property, use it as the key for the database
      const key = task.key || crypto.randomUUID()
      const result = await this.db.update(task, key)
      console.log('Task result:', result)
      this.sendToFrontend({ type: 'DATA_UPDATE', data: task })
      return result
    } catch (error) {
      console.error('Failed to execute task:', error)
      return null
    }
  }

  private async fetchSettings() {
    try {
      console.log('Fetching settings...')
      const settings = await this.db.getAll()
      console.log('Raw settings data:', settings)
      
      // Process the settings data properly
      const settingsData: Record<string, any> = {}
      
      for (const item of settings) {
        // Skip deleted settings
        if (item.value && item.value._deleted) {
          continue
        }
        
        // Make sure we have a valid key
        if (item.key) {
          settingsData[item.key] = item.value
        }
      }
      
      console.log('Processed settings data:', settingsData)
      this.sendToFrontend({ type: 'SETTINGS_DATA', data: settingsData })
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      this.sendToFrontend({ 
        type: 'ERROR', 
        message: `Failed to fetch settings: ${error instanceof Error ? error.message : String(error)}` 
      })
      this.sendToFrontend({ type: 'SETTINGS_DATA', data: {} })
    }
  }

  private async updateSettings(key: string, value: any) {
    try {
      console.log('Updating settings:', key, value)
      
      if (value === null) {
        // Handle setting removal by updating with a special value that will be filtered out
        // We'll use the existing update method with a special value
        await this.db.update({ _deleted: true }, key)
        console.log('Setting removed:', key)
      } else {
        // Handle setting update
        // Make sure we're storing the value directly, not as a property of an object
        await this.db.update(value, key)
        console.log('Settings updated successfully')
      }
      
      // Send the updated setting to the frontend
      this.sendToFrontend({ type: 'SETTINGS_UPDATED', key, value })
      
      // Also fetch all settings to ensure consistency
      await this.fetchSettings()
    } catch (error) {
      console.error('Failed to update settings:', error)
      // Send error to frontend
      this.sendToFrontend({ 
        type: 'ERROR', 
        message: `Failed to update setting: ${error instanceof Error ? error.message : String(error)}` 
      })
    }
  }

  private async fetchRelays() {
    try {
      console.log('Fetching relays...')
      const relays = await this.db.getRelays()
      console.log('Relays fetched:', relays)
      
      // Make sure we're sending the correct format
      // The frontend expects either strings or objects with key/value
      const formattedRelays = relays.map(relay => {
        if (typeof relay === 'string') {
          return relay;
        } else if (relay && typeof relay === 'object') {
          // If it's already in the correct format, return as is
          if ('key' in relay && 'value' in relay) {
            return relay;
          }
          // Otherwise, convert to the expected format
          const relayObj = relay as any;
          return {
            key: relayObj.key || String(relay),
            value: relayObj.value || String(relay)
          };
        }
        // Fallback for any other format
        return String(relay);
      });
      
      console.log('Formatted relays:', formattedRelays);
      this.sendToFrontend({ type: 'RELAYS_DATA', data: formattedRelays })
    } catch (error) {
      console.error('Failed to fetch relays:', error)
      this.sendToFrontend({ 
        type: 'ERROR', 
        message: `Failed to fetch relays: ${error instanceof Error ? error.message : String(error)}` 
      })
      this.sendToFrontend({ type: 'RELAYS_DATA', data: [] })
    }
  }

  private async addRelay(url: string) {
    try {
      console.log('Adding relay:', url)
      await this.db.addRelay(url)
      console.log('Relay added successfully')
      // Send updated relays data
      await this.fetchRelays()
      // Reinitialize WebSocket with the first relay
      await this.initializeWebSocket()
    } catch (error) {
      console.error('Failed to add relay:', error)
      // Send error to frontend
      this.sendToFrontend({ 
        type: 'ERROR', 
        message: `Failed to add relay: ${error instanceof Error ? error.message : String(error)}` 
      })
    }
  }

  private async removeRelay(key: string) {
    try {
      console.log('Removing relay:', key)
      await this.db.removeRelay(key)
      console.log('Relay removed successfully')
      // Send updated relays data
      await this.fetchRelays()
      // Reinitialize WebSocket with the first relay
      await this.initializeWebSocket()
    } catch (error) {
      console.error('Failed to remove relay:', error)
      // Send error to frontend
      this.sendToFrontend({ 
        type: 'ERROR', 
        message: `Failed to remove relay: ${error instanceof Error ? error.message : String(error)}` 
      })
    }
  }

  private sendToFrontend(message: MessageType) {
    console.log('Sending to frontend:', message)
    
    // Create a string representation of the message for comparison
    const messageStr = JSON.stringify(message);
    
    // Store the last message sent to avoid duplicates
    if (this.lastSentMessage === messageStr) {
      console.log('Skipping duplicate message to frontend');
      return;
    }
    
    this.lastSentMessage = messageStr;
    
    this.sw.clients.matchAll().then((clients: readonly Client[]) => {
      clients.forEach((client: Client) => client.postMessage(message))
    })
  }

  handleFrontendMessage(message: MessageType) {
    console.log('Handling frontend message:', message)
    if (message.type === 'TASK') {
      this.processTask(message.task, message.requiresApproval)
    } else if (message.type === 'PROMPT_RESPONSE') {
      this.emitter.emit(`prompt-${message.promptId}`, message.response)
    } else if (message.type === 'FETCH_SETTINGS') {
      this.fetchSettings()
    } else if (message.type === 'UPDATE_SETTINGS') {
      this.updateSettings(message.key, message.value)
    } else if (message.type === 'FETCH_RELAYS') {
      this.fetchRelays()
    } else if (message.type === 'ADD_RELAY') {
      this.addRelay(message.url)
    } else if (message.type === 'REMOVE_RELAY') {
      this.removeRelay(message.key)
    } else if (message.type === 'FETCH_PERMISSIONS') {
      this.fetchPermissions()
    }
  }

  async fetchPermissions() {
    try {
      const permissions = await this.db.getPermissions()
      this.sendToFrontend({ type: 'PERMISSIONS_DATA', data: permissions })
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }
}
