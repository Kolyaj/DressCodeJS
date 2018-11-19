//=== /js-dev/index.js
Foo.Bar();

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js

//=== /js-libs/Foo/Bar.js
Foo.Bar = {};
Foo.Bar.prototype = {};
Foo.Bar.prototype.constructor = Foo.Bar;
Foo.Bar.foo.bar = {};

//=== /js-libs/.dresscode
//: .

//===
Foo.Bar = {};
Foo.Bar.prototype = {};
Foo.Bar.prototype.constructor = Foo.Bar;
Foo.Bar.foo.bar = {};
Foo.Bar();
