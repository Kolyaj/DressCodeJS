//=== /js-dev/index.js
Foo.bar();

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
Foo.bar = Foo;

//=== /js-libs/.dresscode
//: .

//===
var Foo = {};
Foo.bar = Foo;
Foo.bar();
