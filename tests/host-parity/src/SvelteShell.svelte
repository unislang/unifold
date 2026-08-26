<script lang="ts">
  import { onMount } from "svelte";

  import {
    HostFramework,
    mountHost,
    probeRuntimeContext,
    probeSnapshot,
    recordProbeEvent
  } from "./host-runtime.js";

  let host: HTMLElement;
  let renderCount = 1;

  onMount(() => mountHost(HostFramework.Svelte, host));
</script>

<main id="shell" data-shell-render-count={renderCount}>
  <button type="button" onclick={() => (renderCount += 1)}>Rerender shell</button>
  <unifold-text-field
    id="framework-probe"
    label="Framework probe"
    value="Host value"
    eventNode={probeSnapshot}
    runtimeContext={probeRuntimeContext}
    onunifold-event={recordProbeEvent}
  ></unifold-text-field>
  <unifold-stack><span data-testid="slotted-content">Slotted content</span></unifold-stack>
  <div id="unifold-host" bind:this={host}></div>
</main>
