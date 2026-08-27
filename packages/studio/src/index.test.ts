import { expect, it } from "vitest";

import {
  createStudioSessionActor,
  createUnifoldStudioPreview,
  StudioSessionState,
  UnifoldStudioSession
} from "./index.js";

it("exports the packaged Studio session surface", () => {
  expect(createStudioSessionActor).toBeTypeOf("function");
  expect(createUnifoldStudioPreview).toBeTypeOf("function");
  expect(UnifoldStudioSession).toBeTypeOf("function");
  expect(StudioSessionState.PreviewReady).toBe("preview-ready");
});
