---
"@unislang/unifold-contracts": minor
"@unislang/unifold-ir": minor
"@unislang/unifold-jsonui": minor
---

Pin the executable JsonUI authoring profile to an exact upstream revision, reject unsupported syntax
before IR generation, retain the upstream revision in IR provenance, and publish exact compatibility
case diagnostics and fixture provenance. A test-only browser oracle verifies the real upstream
artifacts against Unifold normalization without adding React or JsonUI to production dependencies.
