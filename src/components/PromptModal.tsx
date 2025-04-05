import { useEffect, useState } from 'react'
import { MessageType } from '@/types/index.js'
import nfcService from '@/lib/nfc'
import '@/styles/modal.css'

type PromptMessageType = Extract<MessageType, { type: 'PROMPT' }>

interface PromptModalProps {
  message: PromptMessageType
  onResponse: (response: { approved: boolean, remember?: boolean }) => void
}

export function PromptModal({ message, onResponse }: PromptModalProps) {
  const [remember, setRemember] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [nfcStatus, setNfcStatus] = useState<string>('')
  const [expectedNfcValue, setExpectedNfcValue] = useState<string>('')
  
  useEffect(() => {
    console.log('PromptModal: Showing prompt', message);
    
    // Check if the task has an expected NFC value for approval
    if (message.task && message.task.nfcApprovalValue) {
      setExpectedNfcValue(message.task.nfcApprovalValue);
    }
  }, [message]);

  const handleResponse = (approved: boolean) => {
    console.log('PromptModal: Sending response', { approved, remember })
    onResponse({ approved, remember })
  }

  const startNfcScan = async () => {
    if (!nfcService.isSupported()) {
      setNfcStatus('NFC not supported in this browser');
      return;
    }
    
    try {
      setIsScanning(true);
      setNfcStatus('Scanning for NFC tag...');
      
      const result = await nfcService.read({
        onReading: (data) => {
          setNfcStatus(`Read: ${data}`);
          
          // If we have an expected value, check if it matches
          if (expectedNfcValue && data === expectedNfcValue) {
            setNfcStatus('NFC tag matched! Approving...');
            handleResponse(true);
          } else if (expectedNfcValue) {
            setNfcStatus('NFC tag did not match expected value');
          } else {
            // If no expected value, just approve with any NFC tag
            setNfcStatus('NFC tag detected! Approving...');
            handleResponse(true);
          }
        },
        onError: (error) => {
          setNfcStatus(`Error: ${error}`);
        },
        onScanStart: () => {
          setNfcStatus('Scanning for NFC tag...');
        },
        onScanEnd: () => {
          setIsScanning(false);
        }
      });
      
      if (!result.success) {
        setNfcStatus(`Scan failed: ${result.error}`);
        setIsScanning(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setNfcStatus(`Error: ${errorMessage}`);
      setIsScanning(false);
    }
  }
  
  const stopNfcScan = () => {
    if (isScanning) {
      nfcService.stopScan();
      setNfcStatus('Scan stopped');
      setIsScanning(false);
    }
  }

  return (
    <div className="prompt-modal">
      <div className="prompt-content">
        <h3>Approve Task?</h3>
        <pre>{JSON.stringify(message.task, null, 2)}</pre>
        
        {expectedNfcValue && (
          <div className="nfc-approval">
            <p>This task requires NFC approval with value: <strong>{expectedNfcValue}</strong></p>
            <div className="nfc-actions">
              <button 
                onClick={startNfcScan} 
                disabled={isScanning}
                className="nfc-scan-button"
              >
                {isScanning ? 'Scanning...' : 'Scan NFC Tag'}
              </button>
              {isScanning && (
                <button onClick={stopNfcScan} className="nfc-stop-button">
                  Stop Scan
                </button>
              )}
            </div>
            {nfcStatus && <p className="nfc-status">{nfcStatus}</p>}
          </div>
        )}
        
        <div className="remember-preference">
          <label>
            <input 
              type="checkbox" 
              checked={remember} 
              onChange={(e) => setRemember(e.target.checked)} 
            />
            Remember this preference for future tasks
          </label>
        </div>
        
        <div className="prompt-buttons">
          <button onClick={() => handleResponse(true)}>Approve</button>
          <button onClick={() => handleResponse(false)}>Deny</button>
        </div>
      </div>
    </div>
  )
}
