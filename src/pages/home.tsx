import { useEffect, useState } from 'react'
import { useMessageBus }       from '@/hooks/useMessageBus.js'
import { PromptModal }         from '@/components/PromptModal.js'
import { MessageType }         from '@/types/index.js'
import { RelayEntry }          from '@/backend/db/controller.js'
import nfcService              from '@/lib/nfc'

type PromptMessageType = Extract<MessageType, { type: 'PROMPT' }>

// Define the task interface
interface Task {
  id: number;
  name: string;
  type: string;
  createdAt: string;
  nfcApprovalValue?: string;
}

export function Home() {
  const [ data, setData ] = useState<any>(null)
  const [ promptMessage, setPromptMessage ] = useState<PromptMessageType | null>(null)
  const [ settings, setSettings ] = useState<Record<string, any>>({})
  const [ relays, setRelays ] = useState<RelayEntry[]>([])
  const [ logs, setLogs ] = useState<string[]>([])
  const [ taskName, setTaskName ] = useState('')
  const [ taskType, setTaskType ] = useState('default')
  const [ useNfcApproval, setUseNfcApproval ] = useState(false)
  const [ nfcApprovalValue, setNfcApprovalValue ] = useState('')
  const { onMessage, send } = useMessageBus()

  // Helper function to add logs
  const addLog = (message: string) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
  }

  useEffect(() => {
    const cleanup = onMessage((event) => {
      const message = event.data
      console.log('Processing message:', message)
      addLog(`Received message: ${message.type}`)
      
      switch (message.type) {
        case 'PROMPT':
          setPromptMessage(message)
          addLog(`Prompt received: ${JSON.stringify(message.task)}`)
          break;
        case 'DATA_UPDATE':
          console.log('Updating data:', message.data)
          addLog(`Data updated: ${JSON.stringify(message.data)}`)
          setData(message.data)
          break;
        case 'SETTINGS_DATA':
          console.log('Updating settings:', message.data)
          addLog(`Settings updated: ${JSON.stringify(message.data)}`)
          setSettings(message.data)
          break;
        case 'SETTINGS_UPDATED':
          console.log('Setting updated:', message.key, message.value)
          addLog(`Setting updated: ${message.key} = ${message.value}`)
          setSettings(prev => ({ ...prev, [message.key]: message.value }))
          break;
        case 'RELAYS_DATA':
          console.log('Updating relays:', message.data)
          addLog(`Relays updated: ${JSON.stringify(message.data)}`)
          setRelays(message.data)
          break;
        case 'PERMISSIONS_DATA':
          console.log('Updating permissions:', message.data)
          addLog(`Permissions updated: ${JSON.stringify(message.data)}`)
          break;
        case 'ERROR':
          console.error('Error:', message.message)
          addLog(`Error: ${message.message}`)
          break;
      }
    });

    return cleanup
  }, [onMessage])

  const handlePromptResponse = (response: { approved: boolean, remember?: boolean }) => {
    if (promptMessage) {
      console.log('Sending prompt response:', response)
      addLog(`Sending prompt response: ${JSON.stringify(response)}`)
      navigator.serviceWorker.controller?.postMessage({
        type: 'PROMPT_RESPONSE',
        promptId: promptMessage.promptId,
        response,
      })
      setPromptMessage(null)
    }
  }

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskName.trim()) return
    
    const task: Task = {
      id: Date.now(),
      name: taskName,
      type: taskType,
      createdAt: new Date().toISOString()
    }
    
    // Add NFC approval if enabled
    if (useNfcApproval) {
      task.nfcApprovalValue = nfcApprovalValue;
      addLog(`Task requires NFC approval with value: ${nfcApprovalValue}`);
    }
    
    addLog(`Creating task: ${JSON.stringify(task)}`)
    send({
      type: 'TASK',
      task,
      requiresApproval: true
    })
    
    // Reset form
    setTaskName('')
    setUseNfcApproval(false)
    setNfcApprovalValue('')
  }

  return (
    <div>
      <h2>Home</h2>
      
      <div className="task-form">
        <h3>Create Task</h3>
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label htmlFor="taskName">Task Name:</label>
            <input
              type="text"
              id="taskName"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Enter task name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="taskType">Task Type:</label>
            <select
              id="taskType"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            >
              <option value="default">Default</option>
              <option value="nfc">NFC</option>
              <option value="settings">Settings</option>
              <option value="relay">Relay</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useNfcApproval}
                onChange={(e) => setUseNfcApproval(e.target.checked)}
              />
              Require NFC Approval
            </label>
          </div>
          
          {useNfcApproval && (
            <div className="form-group">
              <label htmlFor="nfcApprovalValue">NFC Approval Value:</label>
              <input
                type="text"
                id="nfcApprovalValue"
                value={nfcApprovalValue}
                onChange={(e) => setNfcApprovalValue(e.target.value)}
                placeholder="Value required on NFC tag for approval"
              />
              <small className="form-help">
                Leave empty to approve with any NFC tag, or enter a specific value that must be on the tag.
              </small>
            </div>
          )}
          
          <button type="submit">Create Task</button>
        </form>
      </div>
      
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      {promptMessage && (
        <PromptModal message={promptMessage} onResponse={handlePromptResponse} />
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h3>Debug Console</h3>
        <button onClick={clearLogs}>Clear Logs</button>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto', 
          border: '1px solid #ccc', 
          padding: '10px',
          marginTop: '10px',
          backgroundColor: '#f5f5f5',
          fontFamily: 'monospace'
        }}>
          {logs.length === 0 ? (
            <p>No logs yet. Activity will appear here.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}