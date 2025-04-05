import { spawn } from 'child_process'
import ngrok     from 'ngrok'
import qrcode    from 'qrcode'
import chokidar  from 'chokidar'

import {
  build_js,
  build_css,
  copy_assets,
  watch_js
} from './utils.js'

/**
 * Development server script.
 */
async function dev() {
  try {
    // Initial build
    await build_js()
    await build_css()
    copy_assets()

    // Watch JavaScript
    const stop_js_watch = await watch_js()

    // Watch CSS
    const css_watcher = chokidar.watch('src/styles/*.css')
    css_watcher.on('change', async (path) => {
      console.log(`CSS file changed: ${path}`)
      await build_css()
    })

    // Start server.
    const serve_process = spawn('npx', ['serve', '-s', 'dist'], { stdio: 'inherit', shell: true })
    serve_process.on('error', (error) => console.error('Serve failed:', error))

    // Start ngrok
    const url = await ngrok.connect(3000)
    console.log(`Server available at: ${url}`)

    qrcode.toString(url, { type: 'terminal', small: true }, (err, qr) => {
      if (err) {
        console.error('Failed to generate QR code:', err)
      } else {
        console.log('Scan this QR code with your phone to access the app:\n')
        console.log(qr)
      }
    })

    console.log('Development server running at http://localhost:3000 and online at', url)

    // Cleanup on exit
    process.on('SIGINT', async () => {
      console.log('\nShutting down development server...')
      // Stop all watchers first
      stop_js_watch()
      await css_watcher.close()
      // Kill local server
      serve_process.kill()
      try {
        // Disconnect ngrok with proper error handling
        console.log('Disconnecting ngrok tunnel...')
        await ngrok.disconnect(url)
        await ngrok.kill()
        console.log('ngrok tunnel closed')
      } catch (error) {
        console.log('Note: ngrok disconnection encountered an issue, but shutdown will continue')
      }
      console.log('Dev server stopped')
      process.exit(0)
    })
  } catch (error) {
    console.error('Dev failed:', error)
    process.exit(1)
  }
}

dev()
