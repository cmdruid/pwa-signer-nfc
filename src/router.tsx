import { useState } from 'react';
import { Home }     from '@/pages/home'
import { Settings } from '@/pages/settings'
import { NFCPage }  from '@/pages/NFC'

export function Router() {
  const [page, setPage] = useState('home')

  return (
    <div>
      <nav>
        <button onClick={() => setPage('home')}>Home</button>
        <button onClick={() => setPage('settings')}>Settings</button>
        <button onClick={() => setPage('nfc')}>NFC</button>
      </nav>
      {page === 'home' && <Home />}
      {page === 'settings' && <Settings />}
      {page === 'nfc' && <NFCPage />}
    </div>
  );
}