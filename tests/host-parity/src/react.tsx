import { createElement, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  HostFramework,
  mountHost,
  probeRuntimeContext,
  probeSnapshot,
  recordProbeEvent,
  registerHostElements,
  requireRoot
} from "./host-runtime.js";

function Shell() {
  const host = useRef<HTMLDivElement>(null);
  const [renderCount, setRenderCount] = useState(1);
  useEffect(() => {
    if (host.current === null) throw new Error("React host ref is missing.");
    return mountHost(HostFramework.React, host.current);
  }, []);
  return (
    <main id="shell" data-shell-render-count={renderCount}>
      <button type="button" onClick={() => setRenderCount((value) => value + 1)}>
        Rerender shell
      </button>
      {createElement("unifold-text-field", {
        eventNode: probeSnapshot,
        id: "framework-probe",
        label: "Framework probe",
        "onunifold-event": recordProbeEvent,
        runtimeContext: probeRuntimeContext,
        value: "Host value"
      })}
      {createElement(
        "unifold-stack",
        null,
        <span data-testid="slotted-content">Slotted content</span>
      )}
      <div id="unifold-host" ref={host} />
    </main>
  );
}

registerHostElements();
const root = createRoot(requireRoot("root"));
root.render(<Shell />);
window.__unifoldUnmountHost = () => root.unmount();
