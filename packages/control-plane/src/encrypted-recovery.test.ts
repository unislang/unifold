import { beforeEach, expect, it, vi } from "vitest";

import {
  EncryptedControlPlaneRecovery,
  EncryptedRecoveryErrorCode,
  EncryptedRecoveryStatus,
  type ControlPlaneExternalBackupVaultPort,
  type EncryptedBackupEnvelope
} from "./encrypted-recovery.js";

const command = {
  backupId: "backup-2026-08-26",
  createdAt: "2026-08-26T00:00:00.000Z",
  tenantId: "tenant-1"
};

let key: CryptoKey;

beforeEach(async () => {
  key = await crypto.subtle.generateKey({ length: 256, name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
});

it("writes only an encrypted envelope and verifies an isolated restore before checkpointing", async () => {
  const fixture = recoveryFixture();
  const recovery = new EncryptedControlPlaneRecovery(fixture.options);
  const created = await recovery.createBackup(command);
  expect(created.status).toBe(EncryptedRecoveryStatus.Succeeded);
  const envelope = fixture.envelopes.get(command.backupId);
  expect(envelope).toMatchObject({ algorithm: "AES-256-GCM", keyId: "key-2026-08" });
  expect(JSON.stringify(envelope)).not.toContain("private-document-value");

  const drilled = await recovery.runRestoreDrill({
    backupId: command.backupId,
    drilledAt: "2026-08-26T01:00:00.000Z",
    tenantId: command.tenantId
  });
  expect(drilled.status).toBe(EncryptedRecoveryStatus.Succeeded);
  expect(fixture.verifyRestore).toHaveBeenCalledWith(
    "tenant-1",
    { document: "private-document-value", tenantId: "tenant-1" },
    undefined
  );
  expect(fixture.checkpoint).toHaveBeenCalledOnce();
});

it("pins key identity and preserves last-known-good on tampering or missing keys", async () => {
  const fixture = recoveryFixture();
  const recovery = new EncryptedControlPlaneRecovery(fixture.options);
  await recovery.createBackup(command);
  const original = requireEnvelope(fixture.envelopes);
  fixture.envelopes.set(command.backupId, { ...original, keyId: "missing-key" });
  const missingKey = await recovery.runRestoreDrill(drillCommand());
  expectRecoveryCode(missingKey, EncryptedRecoveryErrorCode.KeyUnavailable);
  expect(fixture.checkpoint).not.toHaveBeenCalled();

  fixture.envelopes.set(command.backupId, {
    ...original,
    plaintextSha256: "A".repeat(43)
  });
  const digestTampered = await recovery.runRestoreDrill(drillCommand());
  expectRecoveryCode(digestTampered, EncryptedRecoveryErrorCode.IntegrityFailed);

  fixture.envelopes.set(command.backupId, {
    ...original,
    ciphertext: tamperedCiphertext(original.ciphertext)
  });
  const ciphertextTampered = await recovery.runRestoreDrill(drillCommand());
  expectRecoveryCode(ciphertextTampered, EncryptedRecoveryErrorCode.DecryptionFailed);
  expect(fixture.checkpoint).not.toHaveBeenCalled();
});

it("contains verification failures and honors cancellation without changing the checkpoint", async () => {
  const fixture = recoveryFixture();
  fixture.verifyRestore.mockRejectedValueOnce(new Error("private scratch restore failure"));
  const recovery = new EncryptedControlPlaneRecovery(fixture.options);
  await recovery.createBackup(command);
  const failed = await recovery.runRestoreDrill(drillCommand());
  expect(failed).toEqual({
    error: {
      code: EncryptedRecoveryErrorCode.RestoreVerificationFailed,
      messageKey: "control-plane.encrypted-recovery.restore-verification-failed"
    },
    status: EncryptedRecoveryStatus.Failed
  });
  expect(JSON.stringify(failed)).not.toContain("scratch restore");
  expect(fixture.checkpoint).not.toHaveBeenCalled();

  const controller = new AbortController();
  controller.abort();
  const cancelled = await recovery.createBackup({ ...command, signal: controller.signal });
  expect(cancelled.status).toBe(EncryptedRecoveryStatus.Cancelled);
  expect(cancelled.error?.code).toBe(EncryptedRecoveryErrorCode.Cancelled);
});

function recoveryFixture() {
  const envelopes = new Map<string, EncryptedBackupEnvelope>();
  const vault: ControlPlaneExternalBackupVaultPort = {
    async read(_tenantId, backupId) {
      return envelopes.get(backupId);
    },
    async write(envelope) {
      envelopes.set(envelope.backupId, envelope);
    }
  };
  const checkpoint = vi.fn(async () => undefined);
  const verifyRestore = vi.fn(async () => undefined);
  return {
    checkpoint,
    envelopes,
    options: recoveryOptions(vault, checkpoint, verifyRestore),
    verifyRestore
  };
}

function recoveryOptions(
  vault: ControlPlaneExternalBackupVaultPort,
  checkpoint: ReturnType<typeof vi.fn>,
  verifyRestore: ReturnType<typeof vi.fn>
) {
  return {
    checkpoint: { recordLastKnownGood: checkpoint },
    keys: {
      activeKey: async () => ({ key, keyId: "key-2026-08" }),
      resolveKey: async (_tenantId: string, keyId: string) =>
        keyId === "key-2026-08" ? key : undefined
    },
    nonce: () => Uint8Array.from({ length: 12 }, (_value, index) => index + 1),
    source: {
      exportTenant: async () => ({ document: "private-document-value", tenantId: "tenant-1" }),
      verifyRestore
    },
    vault
  };
}

function requireEnvelope(
  envelopes: ReadonlyMap<string, EncryptedBackupEnvelope>
): EncryptedBackupEnvelope {
  const envelope = envelopes.get(command.backupId);
  if (envelope === undefined) throw new Error("Expected encrypted backup envelope.");
  return envelope;
}

function tamperedCiphertext(value: string): string {
  const replacement = value.endsWith("A") ? "B" : "A";
  return `${value.slice(0, -1)}${replacement}`;
}

function expectRecoveryCode(result: unknown, code: EncryptedRecoveryErrorCode): void {
  expect(result).toMatchObject({ error: { code }, status: EncryptedRecoveryStatus.Failed });
}

function drillCommand() {
  return {
    backupId: command.backupId,
    drilledAt: "2026-08-26T01:00:00.000Z",
    tenantId: command.tenantId
  };
}
