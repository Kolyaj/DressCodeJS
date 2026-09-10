# AGENTS.md

## Знания

### Архитектура

- Ядро наследуется: `DressCode` от `Jossy`, `Parser` от `jossy/lib/Parser`, `Builder` от `jossy/lib/Builder` (через iclass). Кастомные директивы dresscode: `require`, `dresscode_label`, `dresscode_endlabel` ([lib/Parser.js](lib/Parser.js)).
- Kонтракт Jossy: `#import f.js::label` с labels `['']` = только базовый код (всё кроме label-регионов); список labels = только эти регионы. `#require X.y` с lowercase-хвостом (`Parser.js`) превращается в import c label-фильтром — так работает частичное включение членов index.js.
- Auto-label — только для *member-деклараций компонента, который определяет файл*: условие `declaration.leftPart.left === componentInFile.cname` (lib/DressCode.js) — класс-декларация `MyProject.App = ...` не лейблится (это намерено), member `MyProject.Forms.Abstract.helper = 1` — да.
- Injection в `_parseCode` (lib/DressCode.js): `injections` — позиция → одна строка. label инжектится в начало декларации, endlabel — сразу после неё (включая `\n`, т.е. в начало следующей строки). usages пропускают занятые позиции — это и защита от self-require, и источник коллизии (см. todo).
- `$$`: макрос добавляется только в Builder компонента (есть `privatePrefix`). Production: `$$[suffix]` → `_N_` через `PrivateNames` (base36-индекс в общем списке); стабильность между билдами — только через `--private-dict`. Debug: сырой cname.
- Кэши Jossy не инвалидируются автоматически (`clearCache()` — за вызывающим); DressCode добавляет собственные кэши: `_dresscodeFilePromises`, `_componentsInDirPromises`, `_componentsForDir(Promises)`.
- esprima 4.0.1 = ES2017 (let/arrow/class — ОК; `?.`, `??`, `import.meta` — throw). Visitor-колбэк срабатывает по мере разбора: при сбое parse `usages` до точки ошибки сохраняются, `declarations` (нужен ast) — теряются → частичная карта зависимостей молча.
- Встроенные свойства исключены из auto-label списком `['prototype', 'toString', 'valueOf']` (lib/DressCode.js).

### Тесты

- Фикстуры [test/tests/](test/tests/): секции `//=== путь` (первая = input, последняя = ожидаемый вывод), префикс `//: ` в строках контента; подхватываются mocha автоматически. Unit-тесты с mock-fs — в [test/index.js](test/index.js).
- `npm test` — полный прогон (31 тест, ~24мс).
