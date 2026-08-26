import type { DataSourceHandler, DataSourceRegistryPort } from "./types.js";

const operationIdPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;

export class DataSourceRegistry implements DataSourceRegistryPort {
  private readonly handlers = new Map<string, DataSourceHandler>();

  register(operationId: string, handler: DataSourceHandler): () => void {
    if (!isDataOperationId(operationId)) {
      throw new Error(`Invalid data operation ID: ${operationId}`);
    }
    if (this.handlers.has(operationId)) {
      throw new Error(`Data operation is already registered: ${operationId}`);
    }
    this.handlers.set(operationId, handler);
    return () => this.handlers.delete(operationId);
  }

  resolve(operationId: string): DataSourceHandler | undefined {
    return this.handlers.get(operationId);
  }
}

export function isDataOperationId(value: string): boolean {
  return value.length <= 128 && operationIdPattern.test(value);
}
