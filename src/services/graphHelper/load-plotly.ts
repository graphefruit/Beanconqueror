export const PLOTLY_SCRIPT = 'assets/js/plotly.min.js';

/** Set while the script is being loaded. */
let loading: Promise<void> | undefined;

/**
 * Loads Plotly (the global `Plotly`) the first time a graph needs it, not at
 * start-up. Resolves at once when it is already there.
 */
export function loadPlotly(): Promise<void> {
  if (Reflect.has(window, 'Plotly')) {
    return Promise.resolve();
  }
  loading ??= new Promise<void>((_resolve, _reject) => {
    const script = document.createElement('script');
    script.src = PLOTLY_SCRIPT;
    script.onload = () => {
      loading = undefined;
      _resolve();
    };
    script.onerror = () => {
      loading = undefined;
      script.remove();
      _reject(new Error(`${PLOTLY_SCRIPT} could not be loaded`));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Draws once Plotly is loaded. A graph whose library cannot be loaded is not
 * drawn, as before, when the script tag failed; the failure is logged.
 */
export function drawWhenPlotlyLoaded(_draw: () => void): void {
  loadPlotly().then(_draw, (_error: unknown) => {
    console.error('Graph not drawn', _error);
  });
}
