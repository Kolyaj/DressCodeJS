//=== /js-dev/index.js
Foo.Bar.Baz();

//=== /.dresscode
//: js-libs

//=== /js-libs/Foo/index.js
var Foo = {};

//=== /js-libs/Foo/Bar/index.js
Foo.Bar = {};

//=== /js-libs/Foo/Bar/Baz.js
Foo.Bar.Baz = function() {

};

//===
var Foo = {};
Foo.Bar = {};
Foo.Bar.Baz = function() {

};
Foo.Bar.Baz();
