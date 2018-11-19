//=== /js-dev/index.js
Foo.baz();

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
Foo.bar = {};
Foo.xyz = {};
Foo.baz = Foo.bar;

//=== /js-libs/.dresscode
//: .

//===
var Foo = {};
Foo.bar = {};
Foo.baz = Foo.bar;
Foo.baz();

