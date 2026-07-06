/**
 * LaunchPilot client SDK — vanilla JS, no dependencies.
 *
 * Usage:
 *   <script src="https://your-launchpilot-host/sdk/launchpilot.js"></script>
 *   <script>
 *     const lp = LaunchPilot.init({
 *       apiKey: "lp_...",              // from Settings > Environments
 *       baseUrl: "https://your-launchpilot-host",
 *     });
 *
 *     const isOn = await lp.getFlag("new-checkout-flow", false, { userId: "u_123", plan: "pro" });
 *     if (isOn) { ... }
 *   </script>
 */
(function (global) {
  function init(options) {
    if (!options || !options.apiKey) {
      throw new Error("LaunchPilot.init requires an apiKey");
    }
    const apiKey = options.apiKey;
    const baseUrl = (options.baseUrl || "").replace(/\/$/, "");
    const timeoutMs = options.timeoutMs || 2000;

    async function getFlag(flagKey, defaultValue, context) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${baseUrl}/api/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, flagKey, context: context || {} }),
          signal: controller.signal,
        });
        if (!res.ok) return defaultValue;
        const data = await res.json();
        return typeof data.enabled === "boolean" ? data.enabled : defaultValue;
      } catch (err) {
        // Fail open to the caller's default rather than breaking their app
        // if LaunchPilot is unreachable.
        return defaultValue;
      } finally {
        clearTimeout(timeout);
      }
    }

    return { getFlag };
  }

  global.LaunchPilot = { init };
})(typeof window !== "undefined" ? window : globalThis);
