//=== /js-dev/index.js
Foo.bar();

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = function() {};
Foo.constructor = Foo;
Foo.bar = function() {};

//=== /js-libs/.dresscode
//: .

//===
var Foo = function() {};
Foo.constructor = Foo;
Foo.bar = function() {};
Foo.bar();
