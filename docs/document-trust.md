# Document trust, signatures, and migrations

Unifold provides one explicit ingress boundary for JSON received as text or as a signed envelope.
`loadUnifoldDocument()` applies this order:

1. validate the envelope shape and payload byte budget;
2. resolve a trusted public key and verify the Ed25519 signature over the exact UTF-8 payload;
3. parse JSON;
4. apply a bounded chain of host-registered pure migrations;
5. expand compositions and compile through the normal Unifold IR boundary.

Verification deliberately happens before parsing and migration. A signature therefore describes the
original bytes that were reviewed or published, not a later transformed representation. Migration
records become provenance on the loaded result. Invalid input never produces partial IR.

## Signed loading

```ts
import {
  UnifoldApplicationMountStatus,
  UnifoldDocumentTrustRequirement,
  loadAndMountUnifoldApplication
} from "@unislang/unifold";
import { signUiDocumentPayload } from "@unislang/unifold-export";

declare const exported: { readonly output: { readonly content: string } };
declare const privateKey: CryptoKey;
declare const trustedPublicKeys: ReadonlyMap<string, CryptoKey>;

const envelope = await signUiDocumentPayload(exported.output.content, "release-key-1", privateKey);
const host = document.querySelector<HTMLElement>("#app");
if (host === null) throw new Error("Missing application host.");
const loaded = await loadAndMountUnifoldApplication(envelope, host, {
  keyResolver: {
    resolve: async (keyId) => trustedPublicKeys.get(keyId)
  },
  trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
});

if (loaded.status === UnifoldApplicationMountStatus.Mounted) {
  console.log(loaded.application.document, loaded.provenance);
}
```

Signing belongs in a trusted build or server environment. Do not ship private signing keys to a
browser. The resolver is also host-owned so rotation, revocation, tenant policy, and approved key
stores remain outside portable JSON. Unknown keys, malformed signatures, modified whitespace or
content, oversized payloads, invalid JSON, and compiler failures reject with enum-backed staged
diagnostics.

For local authored prototypes only, a host may explicitly select
`UnifoldDocumentTrustRequirement.AllowUnsigned`. There is no implicit unsigned fallback when a
signature is required. A valid signature establishes payload integrity and key provenance; it does
not authorize effects, tenants, objects, routes, components, or semantic publication.

## Migration policy

`migrateUnifoldDocument()` and the loader accept trusted migration functions registered by exact
`fromVersion` and `toVersion` edges. Documents cannot embed migration code or select executable
modules. The engine:

- clones input before invoking a migration;
- rejects duplicate source edges and missing paths;
- rejects cycles and chains beyond sixteen steps;
- contains migration exceptions;
- rejects non-JSON, cyclic, and post-migration documents above the one-megabyte document limit;
- requires each output to declare the promised next schema version;
- compiles only the final current-schema document.

Unifold has no invented built-in legacy migration because `UiDocument@1.0.0` is the first published
contract candidate. When a later contract is introduced, its package must ship the reviewed pure
migration, positive/negative/recovery fixtures, rollback guidance, and supported input range in the
same release.

## Envelope contract

The JSON Schema is exported as
`@unislang/unifold-contracts/schemas/signed-ui-document-envelope.schema.json`. The versioned envelope
contains only `$schema`, `envelopeVersion`, the raw JSON `payload`, and an Ed25519 signature with a
bounded `keyId` and unpadded base64url value. Additional fields are rejected. This contract does not
carry executable code, remote URLs, credentials, or authorization claims.
