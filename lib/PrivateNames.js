var iclass = require('iclass');

module.exports.PrivateNames = iclass.create({
    constructor: function() {
        module.exports.PrivateNames.superclass.constructor.apply(this, arguments);
        this._names = [];
    },

    setDict: function(names) {
        this._names = names.slice(0);
    },

    getDict: function() {
        return this._names.slice(0);
    },

    getPrivateName: function(name) {
        var index = this._names.indexOf(name);
        if (index === -1) {
            index = this._names.length;
            this._names.push(name);
        }
        return `_${index.toString(36)}_`;
    }
});
