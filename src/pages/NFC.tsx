import { useState } from 'react'
import nfcService from '@/lib/nfc'
import '@/styles/nfc.css'

export function NFCPage() {
  const [ nfcData, setNfcData ] = useState<string | null>(null)
  const [ writeData, setWriteData ] = useState('')
  const [ logs, setLogs ] = useState<string[]>([])
  const [ isScanning, setIsScanning ] = useState(false)

  // Helper function to add logs
  const addLog = (message: string) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const readNFC = async () => {
    if (!nfcService.isSupported()) {
      addLog('NFC not supported in this browser')
      setNfcData('NFC not supported in this browser')
      return
    }

    try {
      setIsScanning(true)
      addLog('Starting NFC read operation...')
      
      const result = await nfcService.read({
        onReading: (data) => {
          addLog(`Read data: ${data}`)
          setNfcData(data)
        },
        onError: (error) => {
          addLog(`Error: ${error}`)
          setNfcData(`Error: ${error}`)
        },
        onScanStart: () => {
          addLog('Scan started, waiting for NFC tag...')
        },
        onScanEnd: () => {
          addLog('Scan ended')
          setIsScanning(false)
        }
      })
      
      if (!result.success) {
        addLog(`Read failed: ${result.error}`)
        setNfcData(`Error: ${result.error}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      addLog(`Error: ${errorMessage}`)
      setNfcData(`Error: ${errorMessage}`)
      setIsScanning(false)
    }
  }

  const writeNFC = async () => {
    if (!nfcService.isSupported()) {
      addLog('NFC not supported in this browser')
      setNfcData('NFC not supported in this browser')
      return
    }

    try {
      setIsScanning(true)
      addLog('Starting NFC write operation...')
      addLog(`Preparing to write data: ${writeData}`)
      
      const result = await nfcService.write(writeData, {
        onError: (error) => {
          addLog(`Error: ${error}`)
          setNfcData(`Error: ${error}`)
        },
        onScanStart: () => {
          addLog('Scan started, waiting for NFC tag...')
        },
        onScanEnd: () => {
          addLog('Scan ended')
          setIsScanning(false)
        }
      })
      
      if (result.success) {
        addLog('NFC write successful!')
        setNfcData(`Wrote: ${writeData}`)
      } else {
        addLog(`Write failed: ${result.error}`)
        setNfcData(`Error: ${result.error}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      addLog(`Error: ${errorMessage}`)
      setNfcData(`Error: ${errorMessage}`)
      setIsScanning(false)
    }
  }

  const stopScan = () => {
    if (isScanning) {
      nfcService.stopScan()
      addLog('Scan stopped manually')
      setIsScanning(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="nfc-container">
      <h2>NFC Demo</h2>
      <div className="nfc-actions">
        <button 
          onClick={readNFC} 
          disabled={isScanning}
        >
          {isScanning ? 'Scanning...' : 'Read NFC Tag'}
        </button>
        {isScanning && (
          <button onClick={stopScan}>Stop Scan</button>
        )}
      </div>
      
      <div className="nfc-write">
        <input
          type="text"
          value={writeData}
          onChange={e => setWriteData(e.target.value)}
          placeholder="Data to write"
          disabled={isScanning}
        />
        <button 
          onClick={writeNFC}
          disabled={isScanning || !writeData.trim()}
        >
          Write to NFC Tag
        </button>
      </div>
      
      {nfcData && <p className="nfc-data">NFC Data: {nfcData}</p>}
      
      <div className="nfc-logs">
        <h3>Logs</h3>
        <button onClick={clearLogs}>Clear Logs</button>
        <div className="logs-container">
          {logs.length === 0 ? (
            <p>No logs yet. Try reading or writing NFC tags.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}