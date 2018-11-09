//=== /js-dev/index.js
//#require Foo.baz

//=== /js-dev/.dresscode
//: ../js-libs

//=== /js-libs/Foo/index.js
alert('Foo');
//#label bar
alert('Foo.bar');
//#endlabel bar
//#label baz
alert('Foo.baz');
//#endlabel baz

//=== /js-libs/.dresscode
//: .

//===
alert('Foo');
alert('Foo.baz');

