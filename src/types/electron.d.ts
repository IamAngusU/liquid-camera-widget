export {};

declare global {
  interface Window {
    luma?: {
      close: () => Promise<void>;
      minimize: () => Promise<void>;
      setAlwaysOnTop: (value: boolean) => Promise<boolean>;
      setAspectRatio: (ratio: number) => Promise<void>;
      getPlatform: () => string;
    };
  }
}
