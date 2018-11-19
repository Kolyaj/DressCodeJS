//=== /js-dev/index.js
Foo.baz();

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
//#label bar
Foo.bar = {};
//#endlabel bar
//#label baz
Foo.baz = {};
//#endlabel baz

//=== /js-libs/.dresscode
//: .

//===
var Foo = {};
Foo.baz = {};
Foo.baz();
