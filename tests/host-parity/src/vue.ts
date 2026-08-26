import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";

import {
  HostFramework,
  mountHost,
  probeRuntimeContext,
  probeSnapshot,
  recordProbeEvent,
  registerHostElements,
  requireRoot
} from "./host-runtime.js";

const Shell = defineComponent({
  name: "ParityShell",
  setup() {
    const host = ref<HTMLElement>();
    const renderCount = ref(1);
    let dispose: (() => void) | undefined;
    onMounted(() => {
      if (host.value === undefined) throw new Error("Vue host ref is missing.");
      dispose = mountHost(HostFramework.Vue, host.value);
    });
    onBeforeUnmount(() => dispose?.());
    return () =>
      h("main", { "data-shell-render-count": renderCount.value, id: "shell" }, [
        h("button", { onClick: () => (renderCount.value += 1), type: "button" }, "Rerender shell"),
        h("unifold-text-field", {
          eventNode: probeSnapshot,
          id: "framework-probe",
          label: "Framework probe",
          "onUnifold-event": recordProbeEvent,
          runtimeContext: probeRuntimeContext,
          value: "Host value"
        }),
        h("unifold-stack", null, [
          h("span", { "data-testid": "slotted-content" }, "Slotted content")
        ]),
        h("div", { id: "unifold-host", ref: host })
      ]);
  }
});

registerHostElements();
const application = createApp(Shell);
application.mount(requireRoot("root"));
window.__unifoldUnmountHost = () => application.unmount();
