---
"@unislang/unifold": minor
"@unislang/unifold-reactivity": minor
"@unislang/unifold-runtime": minor
"@unislang/unifold-xstate": minor
---

Make mounted document updates atomic across normalized state, selections, rendering, schema.org
publication, XState actors, canonical facts, effects, store writes, and async validation. Add exact
reactivity savepoints and exclusive runtime coordination with staged actor registration,
rollback-safe authority and event-sequence restoration, and FIFO publication after every visible
application surface commits.

Contain exceptions from public actor adapters so one observer cannot interrupt sibling XState
routing or turn an already committed canonical publication into a partial application update.
