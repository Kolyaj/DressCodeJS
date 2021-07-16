//=== /js-dev/index.js
Foo['bar']();

//=== /.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
Foo['bar'] = 1;
Foo['baz'] = 2;

//===
var Foo = {};
Foo['bar'] = 1;
Foo['bar']();
