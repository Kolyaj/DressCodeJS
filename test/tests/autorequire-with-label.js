//=== /js-dev/index.js
Foo.baz();

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
Foo.bar = {};
Foo.baz = {};

//=== /js-libs/.dresscode
//: .

//===
var Foo = {};
Foo.baz = {};
Foo.baz();
