//=== /js-dev/index.js
Foo['bar.bar']();

//=== /.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
Foo['bar.bar'] = 1;
Foo['baz.baz'] = 2;

//===
var Foo = {};
Foo['bar.bar'] = 1;
Foo['bar.bar']();
