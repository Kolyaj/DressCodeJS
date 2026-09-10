# Developing Builders on Top of Jossy

Architecture and extension points for building a custom builder on Jossy. Code samples below are verified against jossy 2.0.0.

## Pipeline

```
file text ─▶ Parser.parse(code, builder) ─▶ Builder AST ─▶ Jossy.compile:
                                                       1. resolve the dependency graph (#include/#without)
                                                       2. rootBuilder.compile(context, labels, layers)
                                                       3. finally: reset dedup state of every builder
```

- **Parser** (`jossy/lib/Parser.js`) — recognizes line/inline directives and dispatches to registered handlers. One instance is shared across all files (stateless apart from the directive registry).
- **Builder** (`jossy/lib/Builder.js`) — one per file; the AST plus the macro table and the dependency map; compiles the AST to a string.
- **Jossy** (`jossy/lib/Jossy.js`, i.e. `require('jossy')`) — reads files, caches parsers/builders, resolves dependencies, orchestrates `compile`.

All three are `iclass` classes. `require('jossy/lib/Parser')` and `require('jossy/lib/Builder')` work from an npm install (only `test/` is unpublished).

## Extension points

| Want to… | How |
|---|---|
| Add a directive | Subclass `Parser`, register it in the constructor |
| Add a block type / change compile behavior | Subclass `Builder`, override `_compileBlock` (and `_isValidContentBlock` / `_resetBlock` where relevant) |
| Use a different parser/builder | Subclass `Jossy`: set the `parserCtor` property and/or override `_createBuilder()` |
| Custom file source | Override `Jossy._readFile(path)` (returns `Promise<string>`; `compileCode` virtual files are already checked first) |
| Change the error policy | `new Jossy(true)` → `failOnErrors` |

### The `iclass` gotcha (bite this first)

`iclass.create(parent, proto)` sets `superclass` on the **constructor function**, not on the prototype — `this.superclass` is `undefined` inside an instance. To chain the parent constructor, reference the constructor function:

```js
var iclass = require('iclass');
const {Jossy} = require('jossy');
const {Parser} = require('jossy/lib/Parser');

var MyParser = iclass.create(Parser, {
    constructor: function() {
        MyParser.superclass.constructor.apply(this, arguments); // registers all built-in directives
        this._registerDirective('version', true, (builder, params) => {
            builder.appendCode('// v' + params + '\n');
        });
    }
});

var MyJossy = iclass.create(Jossy, { parserCtor: MyParser });
// MyJossy now behaves like Jossy and also understands //#version
```

If you do **not** override the constructor, `iclass` chains it automatically — for a "just swap the parser" subclass a property is enough. Prototype methods are inherited as-is; to fall back to base behavior, call `MyX.superclass._compileBlock.call(this, …)`.

## Builder block API (what a directive handler receives)

A registered handler gets `(builder, params)`: the builder **currently being parsed** (that file) and the trimmed argument string.

- `builder.appendCode(text)` — emit text (consecutive calls merge into one code block; macros are applied)
- `builder.appendError(msg)` — honors `failOnErrors` (throw vs. embed a runtime `throw`)
- `builder.appendInclude/Import/Without(path, labels)`, `appendLabel`, `appendLayer`, `appendIf`, `appendSet` … — reuse the built-in block constructors
- `builder._currentBlock` / `builder._currentImportsBlock` — current node of the main tree / the mirrored imports tree
- `builder._dependencies` — relative path → builder (`null` = pending, resolved by `Jossy.compile`); key `''` → the builder itself (this is how `#include ::a` works)
- `builder.addMacros(search, replacement)` — programmatic `#define`

## Invariants to preserve when adding a block type

1. **`_compileBlock` must return a string for the new type.** A block type that is neither handled by `_compileBlock` nor recognized as a container by `_isValidContentBlock` is **silently compiled to `''`** — no error. (Verified: an unknown container with a `code` child emits nothing.)
2. **Filterable containers need an arm in `_isValidContentBlock`** (like `if`/`label`/`layer`); unrecognized container types never reach their content.
3. **Reset dedup state.** `Jossy.compile` calls `builder.reset()` (→ `_resetBlock`) on every builder after every build, in `finally`. Any new dedup flag must be cleared in `_resetBlock`, or the second build silently drops code.
4. **Container directives must mirror the imports tree.** Built-ins (`label`/`layer`/`if`) push a twin block into `_currentImportsBlock` on open and pop both on close, so `#import`/`#without` inside them stay grouped. Do the same, and keep the unclosed-container check (`end()` errors if `_currentBlock.type !== 'root'`).
5. **Don't break cycle safety.** `include`/`without` compiles at most once per build, per `JSON.stringify([context, layers])` hash (`compiledWhen`) — this is what lets cyclic includes terminate. A custom include-like block needs the same guard or a cycle will stack-overflow.
6. **Context mutation is deliberate.** `set` blocks write into the caller's `context` object (flags are per-build globals, in traversal order). Don't "fix" it by copying inside `_compileBlock` — cross-file `#set` propagation depends on it; instead tell users to pass a fresh object per `compile()`.

## The dedup model (two levels)

- A `code` block is emitted at most once per build (`included` flag).
- An `include`/`without` block compiles at most once per `(context, layers)` state (`compiledWhen` map). Labels are **not** part of that key, so `#include f.js::a` and `#include f.js::b` in one file both run, but `f.js`'s base code is emitted once.

## Reset & caching (Jossy level)

`_builders` (resolved path → builder), `_parserPromises`, and `_internalFiles` (`compileCode`) are **never auto-invalidated**; `clearCache()` drops all three. Compile flow: parse the root → loop `parseDependencies` (collect the unfilled dependencies of every builder, resolve them in parallel, repeat until none remain) → `rootBuilder.compile` → `finally` reset every builder. Cyclic dependencies do not loop because of the `compiledWhen` guard.

## Testing (if you extend the library itself)

Fixtures live in `test/tests/*.js`: sections delimited by `//=== name.js` (first named section = entry, last unnamed section = expected output); a leading `//@layer=x` or `//@layers=a,b` sets the layers argument; comparisons normalize Node's varying fs-error text (`ENOENT, <fs error>`); run under mocha + mock-fs. The full suite is verified green on Node 8.17, 10.24, and 18.20; `mock-fs@4.10.4` hangs on Node 15–17, so avoid those.
