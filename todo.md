# todo.md

- [ ] 20260911-1 Сбой парса (синтаксическая ошибка) молча усекает карту зависимостей после точки ошибки — lib/ecma-parser.js `catch (ignored)` — warning в debug/`--fail-on-errors` режимах.
- [ ] 20260911-2 Дубликаты cname между несколькими библиотеками — silently last-wins (lib-b теньюет lib-a) — lib/DressCode.js `_makeComponentsForDir` — предупреждение о shadowing.
- [ ] 20260911-3 Библиотеки из `.dresscode` с не существующим путём молча дают `[]` — lib/DressCode.js `getComponentsInDir` (ENOENT → `[]`) — в `--fail-on-errors` режиме явно указанная зависимость должна падать.
- [ ] 20260911-4 `--private-dict`: запись не атомарная + гонки при параллельных билдах (read → compile → writeJson) — bin/index.js — tmp+rename; в readme прописать dict как обязательный для multi-build.
- [ ] 20260911-5 В исключения auto-label нет `constructor` (только prototype/toString/valueOf): `Foo.constructor = ...` лейблится и может вылететь при label-селекции — lib/DressCode.js — дополнить список встроенных.
- [ ] 20260911-6 `$$` в не компонентных файлах (js-dev) не транслируется, в компонентных — всегда (escape для литерального `$$` невозможен) — lib/Builder.js — решить семантику: warning или escape-последовательность.
- [ ] 20260911-7 `process.exit(1)` сразу после `console.log` — bin/index.js — stdout может не flushed.
