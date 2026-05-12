export { };

declare global {
  interface Window {
    czpSdk?: {
      setBackButtonVisible?: (visible: boolean) => void;
      setCaptureButtonVisible?: (visible: boolean) => void;
    };
  }
}
