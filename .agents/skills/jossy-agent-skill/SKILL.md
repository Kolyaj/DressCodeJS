---
name: jossy-agent-skill
display-name: Jossy
description: Use when building JavaScript with Jossy: its directives, CLI, Node API, cache, or extending Jossy/Parser/Builder to add custom directives.
---

# Jossy — JavaScript Preprocessor/Builder

Jossy stitches a tree of JS source files into one (or several) artifacts. It moves and filters **text** — it does not parse or minify JavaScript — so every directive must sit inside a comment that cannot break syntax. Node >= 8.

Install: `npm install -g jossy` (CLI) or `npm install jossy` (Node API).

## When to use

- Bundling many source files into one artifact, with conditional (`#if`), regional (`#label`), and layered (`#layer`) code.
- Deduplicating code shared between several build targets (the common/feature split via `#without`).
- Building a custom asset pipeline on top of Jossy — see [extending.md](extending.md).

## Directives

Two syntaxes, both comment-based so sources stay valid JS:

- Whole line: `//#name args` (leading whitespace allowed).
- Inline: `/*#name args #*/` (several per line allowed).

Directive names match `[a-z_]+` (lowercase + underscore). `//#Include` or `//#if2` is a plain comment, not a directive. Full semantics and examples: [directives.md](directives.md).

| Directive | Effect |
|---|---|
| `//#include f.js` | Insert file contents (deduped: emitted at most once per build) |
| `//#include f.js::a::b` | Only regions `a`,`b`; `f.js::` = everything **except** labeled regions; `::a` (no file) = region of the current file |
| `//#import f.js[::labels]` | Like include, but into the imports block (printed at the top) |
| `//#imports` | Move the imports block to this point (root level only) |
| `//#without f.js[::labels]` | Compile `f.js` to void: it **and all its transitive deps** are marked included → never emitted again in this build |
| `//#label x` … `//#endlabel` | Named region; **root level only** |
| `//#layer x` … `//#endlayer` | Layer; **root level only** |
| `//#if f` / `//#if not f` … `//#endif` | Flag condition; **nesting is a build error** |
| `//#set f` / `//#unset f` | Flags; applied in code-traversal order |
| `//#define search replace` | Text substitution; **local to the declaring file** |

## CLI

```
jossy -i input.js -o output.js [--set flag]... [--label l]... [--layer x | --layers a --layers b] [--fail-on-errors]
```

- Without `-o` → stdout. `--layer` (one) and `--layers` (many) are mutually exclusive.
- `layers` as a **string** → only that layer (base code suppressed); as an **array** → base + listed layers.
- `--fail-on-errors`: abort the build (exit 1) on error, instead of embedding `throw new Error("JossyError: …")` into the output (the default).

## Node API

```js
const {Jossy} = require('jossy');
const jossy = new Jossy(failOnErrors = false);

const result = await jossy.compile(file, context, labels, layers);
await jossy.compileCode(virtualPath, source, context, labels, layers); // virtual file; relative #include still resolves
jossy.clearCache(); // force a full re-read on the next build
```

One instance can build several related files (e.g. all the JS of a page): shared dependencies are read and parsed once, and the parse cache persists across `compile()` calls.

## Gotchas (verified against real builds)

1. **The cache is never invalidated automatically.** After sources change on disk, call `jossy.clearCache()` (or make a new instance) before rebuilding — mandatory in watch/daemon mode.
2. **`#without` is order-dependent across files.** It marks its target and the whole dependency closure as included *when that build runs*. In the common/feature recipe (`feature.js` = `#without common.js` + `#include big.js`), include `common.js` **before** `feature.js` on the page, or `common.js` will emit nothing.
3. **`compile()` mutates your `context` object.** `#set`/`#unset` write into the object you passed. Pass a fresh object per build, or flags leak between builds.
4. **`#label` regions reorder.** Labeled regions may be emitted in a different order with other code interleaved — never place `#label` inside a function body or expression.
5. **`--label` filters only the entry file.** An included file receives only its own `::labels` selection; the entry's label list does not propagate down the include chain.
6. **Errors default to runtime, not build-time.** Unknown directive, unclosed `#endif`/`#endlabel`/`#endlayer`, or an unreadable file: with `failOnErrors:false` the output embeds `throw new Error("JossyError: …")` — the artifact builds but throws on run.
7. **CRLF is normalized to LF** for all content (files and `compileCode`).

## Developing builders on Jossy

Architecture (Parser → Builder AST → Jossy dependency resolution → compile), the extension points, the invariants you must preserve when adding a block type, and working examples: [extending.md](extending.md).
