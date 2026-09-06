import TokenSimulationModule from 'bpmn-js-token-simulation';
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css';

// bpmn-js-token-simulation intentionally hides its element controls below
// 50% zoom. Large collaborations are initially fitted below that threshold,
// which made message-start triggers unavailable despite an active simulator.
function keepSimulationOverlaysVisible(overlays) {
  const addOverlay = overlays.add.bind(overlays);

  overlays.add = (element, type, options = {}) => addOverlay(element, type, {
    ...options,
    ...(type === 'bts-context-menu' || type === 'bts-token-count'
      ? { show: { ...options.show, minZoom: 0 } }
      : {})
  });
}

keepSimulationOverlaysVisible.$inject = ['overlays'];

export const tokenSimulationVisibilityModule = {
  __init__: ['tokenSimulationOverlayVisibility'],
  tokenSimulationOverlayVisibility: ['type', keepSimulationOverlaysVisible]
};

// This adapter is the only location aware of the token simulator library.
// The UI receives a stateful business session, never a bpmn-js module object.
export const tokenSimulationPlugin = {
  createSession() {
    let enabled = false;
    return {
      isEnabled: () => enabled,
      setEnabled: value => { enabled = Boolean(value); },
      // This technical hook is consumed only by a modeler adapter at composition time.
      getAdditionalModules: () => enabled ? [TokenSimulationModule, tokenSimulationVisibilityModule] : []
    };
  }
};
