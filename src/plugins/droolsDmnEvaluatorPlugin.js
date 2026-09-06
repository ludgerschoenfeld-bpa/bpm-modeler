// This browser-side adapter is intentionally limited to the explicit preload API.
// Drools stays in the local runner owned by the Electron main process.
export const droolsDmnEvaluatorPlugin = {
  // Opening the test-case dialog activates the bundled service before a test is
  // run. Browser development keeps using the explicitly configured endpoint.
  async activate() {
    if (import.meta.env.VITE_DMN_RUNNER_URL) return;
    if (!window.desktopFiles?.activateDmnRunner) throw new Error('dmnTests.error.desktopOnly');
    await window.desktopFiles.activateDmnRunner();
  },
  async evaluate(input) {
    const endpoint = import.meta.env.VITE_DMN_RUNNER_URL;
    if (endpoint) {
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/dmn/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_DMN_RUNNER_TOKEN || ''}` }, body: JSON.stringify(input)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error(body.error || 'dmnTests.error.executionFailed'); error.details = body.details; throw error; }
      return body;
    }
    if (!window.desktopFiles?.evaluateDmn) throw new Error('dmnTests.error.desktopOnly');
    return window.desktopFiles.evaluateDmn(input);
  }
};
