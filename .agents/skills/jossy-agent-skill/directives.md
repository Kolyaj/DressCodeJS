# Jossy Directive Reference

## Syntax

Two forms, both comments so sources remain valid JS:

- **Whole line:** `//#name args` — the entire line is the directive (leading whitespace allowed). A code line that merely *contains* `//#` is not a directive.
- **Inline:** `/*#name args #*/` — several per line allowed; the non-directive parts of the line are emitted as code.

`name` matches `[a-z_]+` — lowercase letters and underscore only. `//#Include` or `//#if2` is a plain comment, not a directive.

## `#include`

```
//#include f.js              // the whole file (path relative to the current file)
//#include f.js::a::b        // only regions a and b of f.js
//#include f.js::            // everything EXCEPT the labeled regions
//#include ::a               // no file: region a of the current file
```

- **Dedup:** a file is emitted at most once per build, and an include with an identical (flags, layers) state runs only once — a repeated `#include f.js` does not duplicate the code.
- **Region selection propagates.** The `::labels` list is the label filter used when `f.js` compiles: `::a::b` → only those labeled regions plus the unlabeled code; `::` (empty) → only the unlabeled code. `#include f.js::a` and `#include f.js::b` in one file both run, but `f.js`'s base code is emitted once.
- **Ordering.** Because regions are filtered, a file's output can appear in a different order than the source, with other code interleaved:

```
//#include String.js::escapeHTML
alert(1);
//#include String.js::truncate
```

produces `var String = {};` (once) + the `escapeHTML` region at the first include site + `alert(1);` + the `truncate` region. This is why `#label` must never be used inside a function body or expression.

## `#import` / `#imports`

`#import` behaves like `#include` (same `::labels` syntax, same dedup), but the block goes into the dedicated **imports block**, which is emitted at the **top** of the file. `//#imports` moves that block to its own position (root level only). `#import`/`#without` placed inside `#label`/`#layer`/`#if` are allowed — the imports tree mirrors those containers, so nested imports stay grouped under them.

## `#without`

```
//#without f.js             // f.js and all of its transitive dependencies
//#without f.js::t3         // only f.js base code + region t3
```

The target is compiled "to void": every code block it touches is marked already-included and is therefore suppressed everywhere else in this build. The `#without` block lives in the imports block, so it runs before the file's main content. Result is independent of directive order *within a file*, but **not** across files (see SKILL.md gotcha 2).

Canonical **common/feature** recipe — `common.js` pulls in widely-used widgets; `feature.js` is:

```
//#without common.js
//#include big-widget.js
```

So `feature.js` contains only the code not already in `common.js`; the page includes **both** scripts, `common.js` first.

## `#if` / `#set` / `#unset`

```
//#set flag        // flag = true
//#unset flag      // flag = false
//#if flag … //#endif
//#if not flag … //#endif
```

Flags are per-build globals, changed in code-traversal order (including across included files). `#if` must not be nested (build error). Entry flags come from `--set` (CLI) or the `context` object (Node API).

## `#label` / `#endlabel`

Named regions; **root level only** (an error inside `#if`/`#label`/`#layer`). Selectable at build time via `--label x` / the `labels` argument → only the listed regions are emitted (unlabeled code always is). `#include f.js::x` selects a region of an included file; `#include ::x` selects a region of the current file.

## `#layer` / `#endlayer`

Layers; **root level only**. Three build modes:

| Mode | Result |
|---|---|
| none | base code only; all `#layer` blocks dropped |
| `--layer x` (string) | only layer `x`; **all base code suppressed** (including base code of included files) |
| `--layers a --layers b` (array) | base code + layers `a`,`b` |

Inside a layer block the content compiles in base mode: the layer's own base code is always emitted; files included *inside* a layer also emit their base code, and their layer blocks are dropped.

## `#define`

```
//#define $_ My_Class_
```

Text substitution: the first token (after the first space) is the search pattern, the rest of the line is the replacement. The search is regex-escaped, i.e. a **literal string**, matched globally on each line. Substitutions accumulate (each later line passes through all previously declared `#define`s), apply to lines **after** the directive, and are **local to the file that declares them** — included files substitute in their own space. The replacement goes through `String.replace`, so avoid `$&`, `$$`, etc. in it.

## Errors

Without `failOnErrors`, errors do not abort the build; they embed `throw new Error("JossyError: <message>")` (message JSON-escaped) at the error site — the artifact builds, then throws on run with the diagnostic. With `failOnErrors:true` (constructor / `--fail-on-errors`) the same errors abort the build. Error cases: unknown directive, missing required argument (e.g. `#include` with no argument), unclosed `#endif`/`#endlabel`/`#endlayer` ("Unexpected EOF."), `#label`/`#layer`/`#imports` outside root, nested `#if`, and an unreadable file (the fs error message is embedded).
