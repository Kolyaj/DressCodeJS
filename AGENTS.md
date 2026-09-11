# AGENTS.md

## Знания

### Архитектура

- Ядро наследуется: `DressCode` от `Jossy`, `Parser` от `jossy/lib/Parser`, `Builder` от `jossy/lib/Builder` (через iclass). Кастомные директивы dresscode: `require`, `dresscode_label`, `dresscode_endlabel` ([lib/Parser.js](lib/Parser.js)).
- Kонтракт Jossy: `#import f.js::label` с labels `['']` = только базовый код (всё кроме label-регионов); список labels = только эти регионы. `#require X.y` с lowercase-хвостом (`Parser.js`) превращается в import c label-фильтром — так работает частичное включение членов index.js.
- Auto-label — только для *member-деклараций компонента, который определяет файл*: условие `declaration.leftPart.left === componentInFile.cname` (lib/DressCode.js) — класс-декларация `MyProject.App = ...` не лейблится (это намерено), member `MyProject.Forms.Abstract.helper = 1` — да.
- Injection в `_parseCode` (lib/DressCode.js): `injections` — позиция → одна строка. label инжектится в начало декларации, endlabel — сразу после неё (включая `\n`, т.е. в начало следующей строки). LHS декларации сам является usage на той же позиции (MemberExpression слева от `=`, ключ = старт строки) → позиция label всегда занята, и guard self-require в usages-цикле от этого зависит; позиция endlabel = старт следующей строки, и usage на ней требует различения через set `labelPositions`: занята только endlabel → require дозаписывается (`+=`), занята label этой же декларации (self-usage LHS) → skip (фикстуры `autorequire-endlabel-collision*`).
- Правила usage→require (lib/DressCode.js): хвост `^[a-z]` → require полным cname (директива отрезает строчный хвост в label); хвост mixed-case → require полным cname (вложенный компонент); хвост целиком в капсе (`/^[A-Z0-9_]+$/`, напр. `VERSION`) → если полный cname не в bycname, require `usage.left` (самый левый известный компонент): капс-имя это константоподобный член, не компонент. Если полный cname в bycname есть (файл с all-caps именем) — срабатывает старое правило, новый ветка не влезает. Self-require базы (компонент требует себя с `['']`) безопасен: jossy дедуплицирует через `compiledWhen[contextHash]` (hash `[context, layers]` без labels) + флаг `included` code-блоков — база печатается ровно один раз. Dedup «самый длинный выживает» в ecma-parser менять не нужно: `usage.left` уже является искомым префиксом.
- `$$`: макрос добавляется только в Builder компонента (есть `privatePrefix`). Production: `$$[suffix]` → `_N_` через `PrivateNames` (base36-индекс в общем списке); стабильность между билдами — только через `--private-dict`. Debug: сырой cname.
- Кэши Jossy не инвалидируются автоматически (`clearCache()` — за вызывающим); DressCode добавляет собственные кэши: `_dresscodeFilePromises`, `_componentsInDirPromises`, `_componentsForDir(Promises)`. `DressCode.clearCache` override — сбрасывает и все четыре dresscode-кэша + Jossy-кэши (super), иначе новый компонент на диске не попадёт в `bycname` (тест `clearCache сбрасывает кэши DressCode`).
- esprima 4.0.1 = ES2017 (let/arrow/class — ОК; `?.`, `??`, `import.meta` — throw). Visitor-колбэк срабатывает по мере разбора: при сбое parse `usages` до точки ошибки сохраняются, `declarations` (нужен ast) — теряются → частичная карта зависимостей молча.
- Встроенные свойства исключены из auto-label списком `['prototype', 'toString', 'valueOf']` (lib/DressCode.js).

### Тесты

- Фикстуры [test/tests/](test/tests/): секции `//=== путь` (первая = input, последняя = ожидаемый вывод), префикс `//: ` в строках контента; подхватываются mocha автоматически. Unit-тесты с mock-fs — в [test/index.js](test/index.js).
- `npm test` — полный прогон (36 тестов, ~28мс).
