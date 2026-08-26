import canonicalize from "canonicalize";

import type { JsonObject } from "@unislang/unifold-contracts";

import {
  backupMetadata,
  backupAuthenticationMetadata,
  backupReceipt,
  base64Url,
  configuredRecoveryMaximum,
  decodeBase64Url,
  decodeRecoverySnapshot,
  drillReceipt,
  envelopeMetadata,
  ownedBytes,
  randomRecoveryNonce,
  recoverySha256,
  validCanonicalUtc,
  validEncryptedEnvelope,
  validRecoveryIdentity
} from "./encrypted-recovery-codec.js";
import {
  EncryptedRecoveryErrorCode,
  EncryptedRecoveryStatus,
  type ControlPlaneBackupKey,
  type EncryptedBackupCommand,
  type EncryptedBackupEnvelope,
  type EncryptedBackupReceipt,
  type EncryptedControlPlaneRecoveryOptions,
  type EncryptedRecoveryResult,
  type EncryptedRestoreDrillCommand,
  type EncryptedRestoreDrillReceipt
} from "./encrypted-recovery-types.js";

export { EncryptedRecoveryErrorCode, EncryptedRecoveryStatus } from "./encrypted-recovery-types.js";
export type * from "./encrypted-recovery-types.js";

const encoder = new TextEncoder();
export class EncryptedControlPlaneRecovery {
  readonly #options: Required<
    Pick<EncryptedControlPlaneRecoveryOptions, "crypto" | "maximumSnapshotBytes" | "nonce">
  > &
    Omit<EncryptedControlPlaneRecoveryOptions, "crypto" | "maximumSnapshotBytes" | "nonce">;

  constructor(options: EncryptedControlPlaneRecoveryOptions) {
    this.#options = {
      ...options,
      crypto: options.crypto ?? crypto.subtle,
      maximumSnapshotBytes: configuredRecoveryMaximum(options.maximumSnapshotBytes),
      nonce: options.nonce ?? randomRecoveryNonce
    };
  }

  async createBackup(
    command: EncryptedBackupCommand
  ): Promise<EncryptedRecoveryResult<EncryptedBackupReceipt>> {
    try {
      validateCommand(command);
      throwIfAborted(command.signal);
      const snapshot = await this.#exportSnapshot(command);
      const active = await this.#activeKey(command);
      const envelope = await this.#encrypt(command, snapshot, active);
      throwIfAborted(command.signal);
      await this.#writeEnvelope(envelope, command.signal);
      return succeeded(backupReceipt(envelope));
    } catch (error) {
      return recoveryFailure(error);
    }
  }

  async runRestoreDrill(
    command: EncryptedRestoreDrillCommand
  ): Promise<EncryptedRecoveryResult<EncryptedRestoreDrillReceipt>> {
    try {
      validateCommand(command);
      throwIfAborted(command.signal);
      const envelope = await this.#readEnvelope(command);
      const snapshot = await this.#decrypt(command, envelope);
      throwIfAborted(command.signal);
      await this.#verifyRestore(command, snapshot);
      const drill = drillReceipt(command, envelope);
      await this.#recordCheckpoint(drill);
      return succeeded(drill);
    } catch (error) {
      return recoveryFailure(error);
    }
  }

  async #exportSnapshot(command: EncryptedBackupCommand): Promise<Uint8Array> {
    const snapshot = await attempt(EncryptedRecoveryErrorCode.SnapshotUnavailable, () =>
      this.#options.source.exportTenant(command.tenantId, command.signal)
    );
    throwIfAborted(command.signal);
    const canonical = await attempt(EncryptedRecoveryErrorCode.SnapshotInvalid, async () =>
      canonicalize(snapshot)
    );
    if (canonical === undefined) throw tagged(EncryptedRecoveryErrorCode.SnapshotInvalid);
    const bytes = encoder.encode(canonical);
    if (bytes.length > this.#options.maximumSnapshotBytes) {
      throw tagged(EncryptedRecoveryErrorCode.SnapshotInvalid);
    }
    return bytes;
  }

  async #activeKey(command: EncryptedBackupCommand): Promise<ControlPlaneBackupKey> {
    const active = await attempt(EncryptedRecoveryErrorCode.KeyUnavailable, () =>
      this.#options.keys.activeKey(command.tenantId, command.signal)
    );
    if (active === undefined || !validRecoveryIdentity(active.keyId)) {
      throw tagged(EncryptedRecoveryErrorCode.KeyUnavailable);
    }
    return active;
  }

  async #encrypt(
    command: EncryptedBackupCommand,
    plaintext: Uint8Array,
    active: ControlPlaneBackupKey
  ): Promise<EncryptedBackupEnvelope> {
    const nonce = ownedBytes(this.#options.nonce());
    if (nonce.length !== 12) throw tagged(EncryptedRecoveryErrorCode.EncryptionFailed);
    const digest = await recoverySha256(this.#options.crypto, plaintext);
    const metadata = backupMetadata(command, active.keyId, digest);
    const ciphertext = await attempt(EncryptedRecoveryErrorCode.EncryptionFailed, () =>
      this.#options.crypto.encrypt(
        {
          additionalData: encoder.encode(
            canonicalize(backupAuthenticationMetadata(metadata)) ?? ""
          ),
          iv: nonce,
          name: "AES-GCM"
        },
        active.key,
        ownedBytes(plaintext)
      )
    );
    return Object.freeze({
      ...metadata,
      ciphertext: base64Url(new Uint8Array(ciphertext)),
      nonce: base64Url(nonce)
    });
  }

  async #writeEnvelope(envelope: EncryptedBackupEnvelope, signal?: AbortSignal): Promise<void> {
    await attempt(EncryptedRecoveryErrorCode.VaultUnavailable, () =>
      this.#options.vault.write(envelope, signal)
    );
  }

  async #readEnvelope(command: EncryptedRestoreDrillCommand): Promise<EncryptedBackupEnvelope> {
    const envelope = await attempt(EncryptedRecoveryErrorCode.VaultUnavailable, () =>
      this.#options.vault.read(command.tenantId, command.backupId, command.signal)
    );
    if (envelope === undefined) throw tagged(EncryptedRecoveryErrorCode.BackupNotFound);
    if (!validEncryptedEnvelope(envelope, command)) {
      throw tagged(EncryptedRecoveryErrorCode.InvalidEnvelope);
    }
    return envelope;
  }

  async #decrypt(
    command: EncryptedRestoreDrillCommand,
    envelope: EncryptedBackupEnvelope
  ): Promise<JsonObject> {
    const key = await this.#resolveKey(command, envelope.keyId);
    const plaintext = await attempt(EncryptedRecoveryErrorCode.DecryptionFailed, () =>
      this.#options.crypto.decrypt(
        {
          additionalData: encoder.encode(canonicalize(envelopeMetadata(envelope)) ?? ""),
          iv: decodeBase64Url(envelope.nonce),
          name: "AES-GCM"
        },
        key,
        decodeBase64Url(envelope.ciphertext)
      )
    );
    const bytes = new Uint8Array(plaintext);
    if ((await recoverySha256(this.#options.crypto, bytes)) !== envelope.plaintextSha256) {
      throw tagged(EncryptedRecoveryErrorCode.IntegrityFailed);
    }
    return attemptSync(EncryptedRecoveryErrorCode.SnapshotInvalid, () =>
      decodeRecoverySnapshot(bytes, this.#options.maximumSnapshotBytes)
    );
  }

  async #resolveKey(command: EncryptedRestoreDrillCommand, keyId: string): Promise<CryptoKey> {
    const key = await attempt(EncryptedRecoveryErrorCode.KeyUnavailable, () =>
      this.#options.keys.resolveKey(command.tenantId, keyId, command.signal)
    );
    if (key === undefined) throw tagged(EncryptedRecoveryErrorCode.KeyUnavailable);
    return key;
  }

  async #verifyRestore(command: EncryptedRestoreDrillCommand, snapshot: JsonObject): Promise<void> {
    await attempt(EncryptedRecoveryErrorCode.RestoreVerificationFailed, () =>
      this.#options.source.verifyRestore(command.tenantId, snapshot, command.signal)
    );
    throwIfAborted(command.signal);
  }

  async #recordCheckpoint(receipt: EncryptedRestoreDrillReceipt): Promise<void> {
    await attempt(EncryptedRecoveryErrorCode.CheckpointUnavailable, () =>
      this.#options.checkpoint.recordLastKnownGood(receipt)
    );
  }
}

function validateCommand(command: {
  backupId: string;
  createdAt?: string;
  drilledAt?: string;
  tenantId: string;
}): void {
  const timestamp = commandTimestamp(command);
  const valid = [
    validRecoveryIdentity(command.backupId),
    validRecoveryIdentity(command.tenantId),
    validCanonicalUtc(timestamp)
  ];
  if (!valid.every(Boolean)) {
    throw tagged(EncryptedRecoveryErrorCode.InvalidEnvelope);
  }
}

function commandTimestamp(command: { createdAt?: string; drilledAt?: string }): string {
  return [command.createdAt, command.drilledAt].find((value) => value !== undefined) ?? "";
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw tagged(EncryptedRecoveryErrorCode.Cancelled);
}

interface TaggedRecoveryError {
  readonly recoveryCode: EncryptedRecoveryErrorCode;
}

function tagged(code: EncryptedRecoveryErrorCode): TaggedRecoveryError {
  return { recoveryCode: code };
}

async function attempt<TValue>(
  code: EncryptedRecoveryErrorCode,
  invoke: () => Promise<TValue>
): Promise<TValue> {
  try {
    return await invoke();
  } catch {
    throw tagged(code);
  }
}

function attemptSync<TValue>(code: EncryptedRecoveryErrorCode, invoke: () => TValue): TValue {
  try {
    return invoke();
  } catch {
    throw tagged(code);
  }
}

function recoveryFailure<TValue>(error: unknown): EncryptedRecoveryResult<TValue> {
  const code = isTagged(error)
    ? error.recoveryCode
    : EncryptedRecoveryErrorCode.SnapshotUnavailable;
  const status =
    code === EncryptedRecoveryErrorCode.Cancelled
      ? EncryptedRecoveryStatus.Cancelled
      : EncryptedRecoveryStatus.Failed;
  return { error: { code, messageKey: `control-plane.encrypted-recovery.${code}` }, status };
}

function isTagged(error: unknown): error is TaggedRecoveryError {
  return typeof error === "object" && error !== null && "recoveryCode" in error;
}

function succeeded<TValue>(value: TValue): EncryptedRecoveryResult<TValue> {
  return { status: EncryptedRecoveryStatus.Succeeded, value };
}
