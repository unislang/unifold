import { mount, unmount } from "svelte";

import SvelteShell from "./SvelteShell.svelte";
import { registerHostElements, requireRoot } from "./host-runtime.js";

registerHostElements();
const application = mount(SvelteShell, { target: requireRoot("root") });
window.__unifoldUnmountHost = () => unmount(application);
