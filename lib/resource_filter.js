var excludedMap = {};

module.exports = function (model, excludedKeys, lean) {
    excludedMap[model.modelName] = excludedKeys;

    function filterPojo(pojo) {
        console.log('pojo!!!');
        var excludedarr = excludedKeys.split(',');
        console.dir(excludedarr);
        for (var i = 0; i < pojo.length; ++i) {
            for (var j = 0; j < excludedarr.length; ++j) {
                delete (pojo[i][excludedarr[j]]);
            }
        }

        return pojo;
    }

    function filterItem(item) {
        // just deleting the excluded keys from item does
        // not modify the object. therefore we build a copy
        var excludedarr = excludedKeys.split(',');
        var it = {};
        var refModel = null;

        for (var key in item) {
            if ((model.schema.options.versionKey &&
                key === model.schema.options.versionKey) ||
                key === '_id') {
                it[key] = item[key];
            } else if (model.schema.paths.hasOwnProperty(key)) {
                if (excludedarr.indexOf(key) === -1) {
                    it[key] = item[key];
                }
            }
        }

        return it;
    }

    function filterItems(items) {
        if (items instanceof Array) {
            return items.map(function (item) {
                return filterItem(item);
            });
        } else {
            return filterItem(items);
        }
    }

    this.filter = function (resource, populatedFields) {
        var filteredResource = lean ?
          filterPojo(resource) : filterItems(resource);
        return filteredResource;
    };
};
