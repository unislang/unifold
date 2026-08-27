---
"@unislang/unifold": minor
"@unislang/unifold-runtime": patch
---

Add a bounded, separately authorized cross-application observation view that preserves tenant and
application identity while exposing only the runtime's classification-aware canonical events.
Reject duplicate identities/runtimes and unsafe identifiers, reauthorize every event, fail closed
when policy evaluation fails, and dispose observation independently from mounted applications.

Transaction facts now project their source from the first command target that actually changed in
the committed transaction, preventing an aggregate ancestor from replacing the causal control in
event provenance.
