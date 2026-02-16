export async function czpSetBackButtonVisible(
  visible: boolean,
  opts?: { timeoutMs?: number; intervalMs?: number; retries?: number }
): Promise<{ ok: boolean; reason?: string }> {
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const intervalMs = opts?.intervalMs ?? 100;
  const retries = opts?.retries ?? 3;

  const waitForSdk = () =>
    new Promise<any | null>((resolve) => {
      const t0 = Date.now();
      const timer = setInterval(() => {
        const sdk = (window as any).czpSdk;
        if (sdk?.setBackButtonVisible) {
          clearInterval(timer);
          resolve(sdk);
        } else if (Date.now() - t0 > timeoutMs) {
          clearInterval(timer);
          resolve(null);
        }
      }, intervalMs);
    });

  const sdk = await waitForSdk();
  if (!sdk) return { ok: false, reason: "czpSdk not found / not ready" };

  try {
    // ยิงซ้ำเผื่อ native/render ช้า
    for (let i = 0; i < retries; i++) {
      sdk.setBackButtonVisible(visible);
      // หน่วงนิดนึง
      await new Promise((r) => setTimeout(r, 250));
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "call failed" };
  }
}
