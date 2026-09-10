//=== /js-dev/index.js
console.log(Foo.VERSION);

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
var Foo = {};
Foo.VERSION = '1.0.0';

//=== /js-libs/.dresscode
//: .

//===
var Foo = {};
Foo.VERSION = '1.0.0';
console.log(Foo.VERSION);
