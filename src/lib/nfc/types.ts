// NFC Library Type Definitions

export interface NFCReadResult {
  success: boolean;
  data: string | null;
  error?: string;
}

export interface NFCWriteResult {
  success: boolean;
  error?: string;
}

export interface NFCOptions {
  onReading?: (data: string) => void;
  onError?: (error: string) => void;
  onScanStart?: () => void;
  onScanEnd?: () => void;
}

export interface NFCService {
  isSupported(): boolean;
  read(options?: NFCOptions): Promise<NFCReadResult>;
  write(data: string, options?: NFCOptions): Promise<NFCWriteResult>;
  stopScan(): void;
} 