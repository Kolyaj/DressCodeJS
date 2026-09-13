# todo.md

- [ ] 20260911-2 Дубликаты cname между несколькими библиотеками — silently last-wins (lib-b теньюет lib-a) — lib/DressCode.js `_makeComponentsForDir` — предупреждение о shadowing.
- [ ] 20260911-6 `$$` в не компонентных файлах (js-dev) не транслируется, в компонентных — всегда (escape для литерального `$$` невозможен) — lib/Builder.js — решить семантику: warning или escape-последовательность.
