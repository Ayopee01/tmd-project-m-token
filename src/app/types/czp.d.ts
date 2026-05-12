export { };

declare global {
  interface Window {
    czpSdk?: {
      setBackButtonVisible?: (visible: boolean) => void;
      setCaptureButtonVisible?: (isEnabled: boolean) => void;
    };
  }
}
