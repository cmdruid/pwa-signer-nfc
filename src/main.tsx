import { createRoot } from 'react-dom/client'
import { App }        from './app'

console.log('Mounting React app')
const root = createRoot(document.getElementById('root')!)
root.render(<App />)
console.log('React app mounted')