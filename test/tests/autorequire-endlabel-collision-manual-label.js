//=== /js-dev/index.js
Foo.a();

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
//#label a
Foo.a = 1;
Bar.b();
//#endlabel a

//=== /js-libs/Bar/index.js
var Bar = {};
Bar.b = function() {};

//=== /js-libs/.dresscode
//: .

//===
var Bar = {};
Bar.b = function() {};
var Foo = {};
Foo.a = 1;
Bar.b();
Foo.a();
