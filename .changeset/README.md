# Changesets

Add a changeset for every consumer-visible package change:

```sh
pnpm changeset
```

Choose the smallest SemVer impact that describes the public contract change. Internal-only work may omit a changeset when it cannot affect a published artifact.
