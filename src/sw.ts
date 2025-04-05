/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { BackgroundService } from '@/backend/service/background.js'

console.log('Service Worker starting...');
const backgroundService = new BackgroundService(self);

// Track the last message processed to avoid duplicates
let lastProcessedMessage: string | null = null;

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  // Create a string representation of the message for comparison
  const messageStr = JSON.stringify(event.data);
  
  // Only process if it's different from the last message
  if (messageStr !== lastProcessedMessage) {
    backgroundService.handleFrontendMessage(event.data);
    lastProcessedMessage = messageStr;
  } else {
    console.log('Skipping duplicate message processing');
  }
});