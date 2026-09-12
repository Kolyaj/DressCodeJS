//=== /js-dev/index.js
var x = Foo.bar;
alert(;
//=== /js-dev/.dresscode
//: ../js-libs
//=== /js-libs/Foo/index.js
var Foo = {};
Foo.bar = {};
//=== /js-libs/.dresscode
//: .
//===
var x = Foo.bar;
alert(;
