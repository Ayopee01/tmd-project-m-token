export {};

declare global {
  interface Window {
    czpSdk?: {
      setTitle?: (title: string, isShowBackButton: boolean) => void;
    };
  }
}
