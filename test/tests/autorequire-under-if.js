//=== /js-dev/index.js
alert('index');
//#if a
Foo.bar();
//#endif
//#if not a
Foo.baz();
//#endif

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
alert('index');
Foo.baz();
