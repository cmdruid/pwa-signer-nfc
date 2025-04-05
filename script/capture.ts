import puppeteer from 'puppeteer'
import fs        from 'fs'
import path      from 'path'

const CAPTURE_URL  = 'http://localhost:3000'
const CAPTURE_PATH = path.join(process.cwd(), 'capture')

/**
 * Captures a screenshot of the local development server
 */
async function captureScreenshot() {
  // Create screenshots directory if needed
  if (!fs.existsSync(CAPTURE_PATH)) {
    fs.mkdirSync(CAPTURE_PATH, { recursive: true })
  }
  
  // Generate simple filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename  = `capture-${timestamp}.png`
  const filepath  = path.join(CAPTURE_PATH, filename)
  
  try {
    // Launch browser and take screenshot
    console.log('Capturing screenshot...')
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto(CAPTURE_URL, { waitUntil: 'networkidle0' })
    await page.screenshot({ path: filepath, fullPage: true })
    await browser.close()
    
    // Generate markdown for easy pasting
    const relativePath = path.relative(process.cwd(), filepath)
    const markdown = `![Screenshot](${relativePath})`
    
    console.log(`\nScreenshot saved: ${relativePath}`)
    console.log(`\nPaste this in your conversation:`)
    console.log(markdown)
    
    return { filepath, markdown }
  } catch (error) {
    console.error('Error capturing screenshot:', error)
    return null
  }
}

// ES Module way to check if file is being run directly
const is_main_module = import.meta.url === `file://${process.argv[1]}`

if (is_main_module) {
  captureScreenshot()
} 

export { captureScreenshot } 