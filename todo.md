# todo.md

- [ ] Сбой парса (синтаксическая ошибка / ES2020 `?.` `??`) молча усекает карту зависимостей после точки ошибки — lib/ecma-parser.js `catch (ignored)` — warning в debug/`--fail-on-errors` режимах.
- [ ] Дубликаты cname между несколькими библиотеками — silently last-wins (lib-b теньюет lib-a) — lib/DressCode.js `_makeComponentsForDir` — предупреждение о shadowing.
- [ ] Библиотеки из `.dresscode` с не существующим путём молча дают `[]` — lib/DressCode.js `getComponentsInDir` (ENOENT → `[]`) — в `--fail-on-errors` режиме явно указанная зависимость должна падать.
- [ ] `--private-dict`: запись не атомарная + гонки при параллельных билдах (read → compile → writeJson) — bin/index.js — tmp+rename; в readme прописать dict как обязательный для multi-build.
- [ ] В исключения auto-label нет `constructor` (только prototype/toString/valueOf): `Foo.constructor = ...` лейблится и может вылететь при label-селекции — lib/DressCode.js — дополнить список встроенных.
- [ ] `$$` в не компонентных файлах (js-dev) не транслируется, в компонентных — всегда (escape для литерального `$$` невозможен) — lib/Builder.js — решить семантику: warning или escape-последовательность.
- [ ] `process.exit(1)` сразу после `console.log` — bin/index.js — stdout может не flushed.
