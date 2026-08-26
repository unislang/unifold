export const MAX_RENDERED_AUDIT_ENTRIES = 200;

interface AuditLogWindowInput {
  readonly entryCount: number;
  readonly itemHeight: number;
  readonly overscan: number;
  readonly scrollTop: number;
  readonly viewportHeight: number;
}

interface AuditLogWindow {
  readonly end: number;
  readonly start: number;
}

export function auditLogWindow(input: AuditLogWindowInput): AuditLogWindow {
  const visible = Math.ceil(input.viewportHeight / input.itemHeight);
  const count = Math.min(MAX_RENDERED_AUDIT_ENTRIES, visible + input.overscan * 2);
  const initial = Math.max(0, Math.floor(input.scrollTop / input.itemHeight) - input.overscan);
  const end = Math.min(input.entryCount, initial + count);
  return { end, start: Math.max(0, end - count) };
}
