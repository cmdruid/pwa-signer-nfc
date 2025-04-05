// Web NFC API Type Definitions
declare module 'nfc-types' {
  export interface NDEFRecord {
    recordType: string;
    data: ArrayBuffer;
  }

  export interface NDEFMessage {
    records: NDEFRecord[];
  }

  export interface NDEFReadingEvent extends Event {
    message: NDEFMessage;
  }

  export interface NDEFReaderType {
    new(): {
      scan(): Promise<void>;
      onreading: (event: NDEFReadingEvent) => void;
    };
  }

  export interface NDEFWriterType {
    new(): {
      write(message: string): Promise<void>;
    };
  }
}

declare global {
  type NDEFRecord = {
    recordType: string;
    data: ArrayBuffer;
  }

  type NDEFMessage = {
    records: NDEFRecord[];
  }

  type NDEFReadingEvent = Event & {
    message: NDEFMessage;
  }

  interface Window {
    NDEFReader: any;
    NDEFWriter: any;
  }
}

export {}; 