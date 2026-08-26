import { describe, expect, it } from "vitest";
import * as subject from "./index.js";

describe("index module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
    expect(subject.DataActorCoordinator).toBeTypeOf("function");
    expect(subject.createDataActor).toBeTypeOf("function");
    expect(subject.createWebStorageStoreAdapter).toBeTypeOf("function");
    expect(subject.createAsyncMemoryStoreAdapter).toBeTypeOf("function");
    expect(subject.createAsyncKeyValueStoreAdapter).toBeTypeOf("function");
    expect(subject.migrateUiStoreSnapshot).toBeTypeOf("function");
    expect(subject.connectAsyncStore).toBeTypeOf("function");
  });
});
