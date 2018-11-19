//=== /js-dev/index.js
//#require Foo.Bar.Baz

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
alert('Foo');

//=== /js-libs/Foo/Bar/index.js
alert('Foo.Bar');

//=== /js-libs/Foo/Bar/Baz.js
alert('Foo.Bar.Baz');

//=== /js-libs/.dresscode
//: .

//===
alert('Foo');
alert('Foo.Bar');
alert('Foo.Bar.Baz');
