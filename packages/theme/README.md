# `@unislang/unifold-theme`

Accessible CSS custom properties shared by Unifold elements and applications.
Import `tokens.css` directly, or import `tailwind.css` in a Tailwind CSS v4
stylesheet to expose the tokens as `unifold-*` theme utilities.

Applications own the token values. Components consume the stable custom
properties, so theming does not require rebuilding the element package.
