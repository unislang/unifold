import {
  HostFramework,
  mountHost,
  probeRuntimeContext,
  probeSnapshot,
  recordProbeEvent,
  registerHostElements,
  requireRoot
} from "./host-runtime.js";

registerHostElements();
const root = requireRoot("root");
root.innerHTML = [
  '<main id="shell" data-shell-render-count="1">',
  '<button id="rerender-shell" type="button">Rerender shell</button>',
  '<unifold-text-field id="framework-probe" label="Framework probe"></unifold-text-field>',
  '<unifold-stack><span data-testid="slotted-content">Slotted content</span></unifold-stack>',
  '<div id="unifold-host"></div>',
  "</main>"
].join("");

const shell = requireRoot("shell");
const probe = requireRoot("framework-probe") as ProbeElement;
probe.eventNode = probeSnapshot;
probe.runtimeContext = probeRuntimeContext;
probe.value = "Host value";
probe.addEventListener("unifold-event", recordProbeEvent);
const dispose = mountHost(HostFramework.Plain, requireRoot("unifold-host"));
requireRoot("rerender-shell").addEventListener("click", () => {
  shell.dataset["shellRenderCount"] = "2";
});
window.__unifoldUnmountHost = () => {
  dispose();
  root.replaceChildren();
};

interface ProbeElement extends HTMLElement {
  eventNode: unknown;
  runtimeContext: unknown;
  value: string;
}
