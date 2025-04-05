import { openDB, DBSchema, IDBPDatabase } from 'idb'

import * as CONST from '@/const.js'

// Define the relay entry type
export interface RelayEntry {
  key: string
  value: string
}

// Define the database schema
interface AppDB extends DBSchema {
  data: {
    key: string
    value: any
  }
  relays: {
    key: string
    value: string
  }
  permissions: {
    key: string
    value: {
      taskType: string
      approved: boolean
      remember: boolean
    }
  }
}

export class DatabaseController {
  private static instance: DatabaseController
  private dbPromise: Promise<IDBPDatabase<AppDB>>
  private subscribers: ((key: string, value: any) => void)[] = []
  private isInitialized = false

  private constructor() {
    console.log('Initializing DatabaseController...')
    this.dbPromise = this.initializeDatabase()
  }

  public static getInstance(): DatabaseController {
    if (!DatabaseController.instance) {
      DatabaseController.instance = new DatabaseController()
    }
    return DatabaseController.instance
  }

  private async initializeDatabase(): Promise<IDBPDatabase<AppDB>> {
    try {
      console.log('Opening database:', CONST.DB_NAME, 'version:', CONST.DB_VERSION)
      const db = await openDB<AppDB>(CONST.DB_NAME, CONST.DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          console.log('Upgrading database from version', oldVersion, 'to', newVersion)
          
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('data')) {
            console.log('Creating data store')
            db.createObjectStore('data')
          }
          
          if (!db.objectStoreNames.contains('relays')) {
            console.log('Creating relays store')
            db.createObjectStore('relays')
          }
          
          if (!db.objectStoreNames.contains('permissions')) {
            console.log('Creating permissions store')
            db.createObjectStore('permissions')
          }
        },
      })
      
      console.log('Database opened successfully')
      this.isInitialized = true
      
      // Initialize default relay after database is created
      await this.initializeDefaultRelay(db)
      
      return db
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  private async initializeDefaultRelay(db: IDBPDatabase<AppDB>) {
    try {
      console.log('Checking for existing relays...')
      const tx = db.transaction('relays', 'readwrite')
      const store = tx.objectStore('relays')
      const relays = await store.getAll()
      
      if (relays.length === 0) {
        console.log('No relays found, adding default relay')
        await store.add('ws://localhost:8002', 'default')
        console.log('Default relay initialized')
      } else {
        console.log('Existing relays found:', relays)
      }
      
      await tx.done
    } catch (error) {
      console.error('Failed to initialize default relay:', error)
    }
  }

  private async getDatabase(): Promise<IDBPDatabase<AppDB>> {
    try {
      return await this.dbPromise
    } catch (error) {
      console.error('Failed to get database:', error)
      throw error
    }
  }

  // General data methods
  async get(key: string) {
    try {
      const db = await this.getDatabase()
      const value = await db.get('data', key)
      console.log('Retrieved data:', key, value)
      return value
    } catch (error) {
      console.error('Error getting data:', error)
      return null
    }
  }

  async getAll() {
    try {
      const db = await this.getDatabase()
      const tx = db.transaction('data', 'readonly')
      const store = tx.objectStore('data')
      
      // Get all keys
      const keys = await store.getAllKeys()
      console.log('Retrieved all keys:', keys)
      
      // Get all values
      const values = await store.getAll()
      console.log('Retrieved all values:', values)
      
      // Combine keys and values
      const data = keys.map((key, index) => {
        const item = {
          key: key.toString(),
          value: values[index]
        }
        console.log('Data item:', item)
        return item
      })
      
      console.log('Retrieved all data:', data)
      return data
    } catch (error) {
      console.error('Error getting all data:', error)
      return []
    }
  }

  async update(value: any, key?: string) {
    try {
      const db = await this.getDatabase()
      const finalKey = key || crypto.randomUUID()
      const tx = db.transaction('data', 'readwrite')
      const store = tx.objectStore('data')
      
      console.log('Updating data with key:', finalKey, 'value:', value)
      
      await store.put(value, finalKey)
      await tx.done
      
      console.log('Data updated:', finalKey, value)
      this.notifySubscribers(finalKey, value)
      return finalKey
    } catch (error) {
      console.error('Error updating data:', error)
      // Return a more specific error that can be handled by the caller
      throw new Error(`Failed to update data: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Relay-specific methods
  async getRelays(): Promise<RelayEntry[]> {
    try {
      const db = await this.getDatabase()
      const tx = db.transaction('relays', 'readonly')
      const store = tx.objectStore('relays')
      
      // Get all keys
      const keys = await store.getAllKeys()
      console.log('Retrieved all relay keys:', keys)
      
      // Get all values
      const values = await store.getAll()
      console.log('Retrieved all relay values:', values)
      
      // Combine keys and values
      const relays = keys.map((key, index) => {
        const item = {
          key: key.toString(),
          value: values[index] as string
        }
        console.log('Relay item:', item)
        return item
      })
      
      console.log('Retrieved relays:', relays)
      return relays
    } catch (error) {
      console.error('Error getting relays:', error)
      // Return an empty array instead of throwing to prevent UI crashes
      return []
    }
  }

  async addRelay(url: string) {
    try {
      const db = await this.getDatabase()
      const key = crypto.randomUUID()
      const tx = db.transaction('relays', 'readwrite')
      const store = tx.objectStore('relays')
      
      await store.add(url, key)
      await tx.done
      
      console.log('Relay added:', key, url)
      this.notifySubscribers('relays', await this.getRelays())
      return key
    } catch (error) {
      console.error('Error adding relay:', error)
      // Return a more specific error that can be handled by the caller
      throw new Error(`Failed to add relay: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async removeRelay(key: string) {
    try {
      const db = await this.getDatabase()
      const tx = db.transaction('relays', 'readwrite')
      const store = tx.objectStore('relays')
      
      await store.delete(key)
      await tx.done
      
      console.log('Relay removed:', key)
      this.notifySubscribers('relays', await this.getRelays())
    } catch (error) {
      console.error('Error removing relay:', error)
      // Return a more specific error that can be handled by the caller
      throw new Error(`Failed to remove relay: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getFirstRelay(): Promise<string> {
    try {
      const relays = await this.getRelays()
      const firstRelay = relays[0]?.value || 'ws://localhost:8002'
      console.log('First relay:', firstRelay)
      return firstRelay
    } catch (error) {
      console.error('Error getting first relay:', error)
      return 'ws://localhost:8002'
    }
  }

  subscribe(callback: (key: string, value: any) => void) {
    this.subscribers.push(callback)
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback)
    }
  }

  private notifySubscribers(key: string, value: any) {
    this.subscribers.forEach(sub => sub(key, value))
  }

  // Permissions methods
  async getPermissions(): Promise<Array<{ key: string, value: { taskType: string, approved: boolean, remember: boolean } }>> {
    try {
      const db = await this.getDatabase()
      const tx = db.transaction('permissions', 'readonly')
      const store = tx.objectStore('permissions')
      
      // Get all keys
      const keys = await store.getAllKeys()
      console.log('Retrieved all permission keys:', keys)
      
      // Get all values
      const values = await store.getAll()
      console.log('Retrieved all permission values:', values)
      
      // Combine keys and values
      const permissions = keys.map((key, index) => {
        const item = {
          key: key.toString(),
          value: values[index] as { taskType: string, approved: boolean, remember: boolean }
        }
        console.log('Permission item:', item)
        return item
      })
      
      console.log('Retrieved permissions:', permissions)
      return permissions
    } catch (error) {
      console.error('Error getting permissions:', error)
      // Return an empty array instead of throwing to prevent UI crashes
      return []
    }
  }

  async getPermission(taskType: string): Promise<{ approved: boolean, remember: boolean } | null> {
    try {
      const permissions = await this.getPermissions()
      const permission = permissions.find(p => p.value.taskType === taskType)
      return permission ? permission.value : null
    } catch (error) {
      console.error('Error getting permission:', error)
      return null
    }
  }

  async setPermission(taskType: string, approved: boolean, remember: boolean): Promise<string> {
    try {
      const db = await this.getDatabase()
      const key = crypto.randomUUID()
      const tx = db.transaction('permissions', 'readwrite')
      const store = tx.objectStore('permissions')
      
      const value = { taskType, approved, remember }
      console.log('Setting permission:', key, value)
      
      await store.put(value, key)
      await tx.done
      
      console.log('Permission set:', key, value)
      this.notifySubscribers('permissions', await this.getPermissions())
      return key
    } catch (error) {
      console.error('Error setting permission:', error)
      throw new Error(`Failed to set permission: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}