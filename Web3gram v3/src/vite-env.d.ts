/// <reference types="vite/client" />

declare module 'qrcode' {
  interface QRCodeToStringOptions {
    type?: 'utf8' | 'svg' | 'terminal';
    width?: number;
    margin?: number;
    scale?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    scale?: number;
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
}

declare module 'tweetnacl' {
  const nacl: any;
  export = nacl;
}
