import { RelayEntry } from '@/backend/db/controller.js'

export type MessageType = {
  type: string
  [key: string]: any
} | {
  type: 'FETCH_RELAYS'
} | {
  type: 'RELAYS_DATA'
  data: RelayEntry[]
} | {
  type: 'ADD_RELAY'
  url: string
} | {
  type: 'REMOVE_RELAY'
  key: string
} | {
  type: 'TASK'
  task: any
  requiresApproval: boolean
} | {
  type: 'PROMPT'
  promptId: string
  task: any
} | {
  type: 'PROMPT_RESPONSE'
  promptId: string
  response: PromptResponse
} | {
  type: 'FETCH_SETTINGS'
} | {
  type: 'SETTINGS_DATA'
  data: Record<string, any>
} | {
  type: 'UPDATE_SETTINGS'
  key: string
  value: any
} | {
  type: 'SETTINGS_UPDATED'
  key: string
  value: any
} | {
  type: 'DATA_UPDATE'
  data: any
} | {
  type: 'FETCH_PERMISSIONS'
} | {
  type: 'PERMISSIONS_DATA'
  data: Array<{ key: string, value: { taskType: string, approved: boolean, remember: boolean } }>
} | {
  type: 'ERROR'
  message: string
}

export type PromptResponse = {
  approved: boolean
  remember?: boolean
}
