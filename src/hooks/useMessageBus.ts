import { useEffect, useCallback, useRef } from 'react'

import { Workbox } from 'workbox-window'

import type { MessageType } from '@/types/index.js'

export function useMessageBus() {
  // Use a ref to track the last message sent to avoid duplicates
  const lastMessageRef = useRef<string | null>(null)
  
  const send = useCallback((message: MessageType) => {
    // Create a string representation of the message for comparison
    const messageStr = JSON.stringify(message)
    
    // Only send if it's different from the last message
    if (messageStr !== lastMessageRef.current) {
      console.log('Sending message to SW:', message)
      navigator.serviceWorker.controller?.postMessage(message)
      lastMessageRef.current = messageStr
    } else {
      console.log('Skipping duplicate message:', message)
    }
  }, [])

  const onMessage = useCallback((callback: (event: MessageEvent) => void) => {
    console.log('Setting up message listener')
    const handler = (event: MessageEvent) => {
      console.log('Received message from SW:', event.data)
      callback(event)
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => {
      console.log('Cleaning up message listener')
      navigator.serviceWorker.removeEventListener('message', handler)
    }
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('Registering service worker...')
      const wb = new Workbox('/sw.js')

      // Ensure the service worker is active before sending messages
      wb.active.then(() => {
        console.log('Service Worker is active')
      })

      wb.register()
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    } else {
      console.log('Service Worker not supported')
    }
  }, [send])

  return { send, onMessage }
}
