import { NFCService, NFCReadResult, NFCWriteResult, NFCOptions } from './types';

/**
 * NFCService implementation using the Web NFC API
 */
export class WebNFCService implements NFCService {
  private ndefReader: any = null;
  private isScanning: boolean = false;

  /**
   * Check if NFC is supported in the current browser
   */
  isSupported(): boolean {
    return 'NDEFReader' in window;
  }

  /**
   * Read data from an NFC tag
   */
  async read(options?: NFCOptions): Promise<NFCReadResult> {
    if (!this.isSupported()) {
      const error = 'NFC not supported in this browser';
      options?.onError?.(error);
      return { success: false, data: null, error };
    }

    try {
      options?.onScanStart?.();
      this.isScanning = true;

      // Create NDEFReader instance
      const NDEFReaderConstructor = window.NDEFReader as { new(): any };
      this.ndefReader = new NDEFReaderConstructor();

      // Start scanning
      await this.ndefReader.scan();

      return new Promise<NFCReadResult>((resolve) => {
        this.ndefReader.onreading = (event: any) => {
          const message = event.message.records.map((record: any) => {
            const decoder = new TextDecoder();
            return decoder.decode(record.data);
          }).join(', ');

          options?.onReading?.(message);
          resolve({ success: true, data: message });
        };

        this.ndefReader.onerror = (error: any) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          options?.onError?.(errorMessage);
          resolve({ success: false, data: null, error: errorMessage });
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      options?.onError?.(errorMessage);
      return { success: false, data: null, error: errorMessage };
    } finally {
      options?.onScanEnd?.();
      this.isScanning = false;
    }
  }

  /**
   * Write data to an NFC tag
   */
  async write(data: string, options?: NFCOptions): Promise<NFCWriteResult> {
    if (!this.isSupported()) {
      const error = 'NFC not supported in this browser';
      options?.onError?.(error);
      return { success: false, error };
    }

    try {
      options?.onScanStart?.();
      this.isScanning = true;

      // Create NDEFReader instance
      const NDEFReaderConstructor = window.NDEFReader as { new(): any };
      this.ndefReader = new NDEFReaderConstructor();

      // Create a text record
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      // First scan to get permission
      await this.ndefReader.scan();

      // Write the data to the NFC tag
      await this.ndefReader.write({
        records: [{
          recordType: "text",
          data: encodedData,
          encoding: "utf-8",
          lang: "en"
        }]
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      options?.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      options?.onScanEnd?.();
      this.isScanning = false;
    }
  }

  /**
   * Stop the current NFC scan
   */
  stopScan(): void {
    if (this.isScanning && this.ndefReader) {
      // The Web NFC API doesn't have a direct way to stop scanning,
      // but we can set a flag to indicate we're no longer scanning
      this.isScanning = false;
    }
  }
}

// Create a singleton instance
const nfcService = new WebNFCService();
export default nfcService; 