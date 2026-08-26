import type { UnifoldRuntime } from "@unislang/unifold-runtime";
import type { Subscription } from "rxjs";

import { createDocumentDiff } from "./diff.js";
import { inspectNodes } from "./picker.js";
import { DevtoolsTimeline } from "./timeline.js";
import type { DevtoolsNodeFilter, DevtoolsTimelineFilter } from "./types.js";

export interface UnifoldDevtoolsSessionOptions {
  readonly capacity?: number;
  readonly now?: () => string;
}

export class UnifoldDevtoolsSession {
  readonly timeline: DevtoolsTimeline;
  readonly #runtime: UnifoldRuntime;
  readonly #now: () => string;
  readonly #subscription: Subscription;

  constructor(runtime: UnifoldRuntime, options: UnifoldDevtoolsSessionOptions = {}) {
    this.#runtime = runtime;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.timeline = new DevtoolsTimeline(options.capacity);
    this.#subscription = runtime.events$.subscribe((event) => {
      this.timeline.append(event, runtime.getTransaction(event.staterevision), this.#now());
    });
  }

  nodes(filter: DevtoolsNodeFilter = {}) {
    return inspectNodes(this.#runtime.inspect(), filter);
  }

  events(filter: DevtoolsTimelineFilter = {}) {
    return this.timeline.snapshot(filter);
  }

  diff(
    before: Parameters<typeof createDocumentDiff>[0],
    after: Parameters<typeof createDocumentDiff>[1]
  ) {
    return createDocumentDiff(before, after);
  }

  dispose(): void {
    this.#subscription.unsubscribe();
    this.timeline.clear();
  }
}
