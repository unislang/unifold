import { z } from "zod";

import { JsonPatchOperationType, UiPatchRisk } from "./types.js";

const jsonPrimitiveSchema = z.union([z.boolean(), z.null(), z.number().finite(), z.string()]);
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([jsonPrimitiveSchema, z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)])
);

const operationSchema = z
  .object({
    from: z.string().max(512).optional(),
    op: z.enum(JsonPatchOperationType),
    path: z.string().max(512),
    value: jsonValueSchema.optional()
  })
  .strict();

export const uiPatchProposalSchema = z
  .object({
    baseHash: z.string().regex(/^[a-f0-9]{64}$/u),
    baseRevision: z.string().min(1).max(128),
    expectedOutcomes: z.array(z.string().min(1).max(256)).max(32),
    intentSummary: z.string().min(1).max(512),
    operations: z.array(operationSchema).min(2).max(32),
    proposalId: z.string().min(1).max(128),
    requestedChecks: z.array(z.string().min(1).max(128)).max(32),
    risk: z.enum(UiPatchRisk)
  })
  .strict();
