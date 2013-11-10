var util = require('util'),
    excludedMap = {},
    filterFn = function (head) {
        return function (ex) {
            return ex.indexOf(head + '.') === 0;
        };
    },
    mapFn = function (head) {
        return function (ex) {
            return ex.replace(head + '.', '');
        };
    },
    shaveHeads = function (arr, head) {
        return arr.filter(filterFn(head)).map(mapFn(head));
    };

module.exports = function (model, excludedKeys) {
    excludedKeys = excludedKeys || '';
    excludedMap[model.modelName] = excludedKeys;

    function filterSubDoc(doc, excluded) {
        var newExcluded, excludedHeads, it = {};

        if (!(excluded instanceof Array)) {
            excluded = excluded.split(',');
        }

        excludedHeads = excluded.filter(function (ex) {
            return ex.indexOf('.') > 0;
        }).map(function (ex) {
            return ex.split('.')[0];
        });

        for (var key in doc) {
            if (excludedHeads.indexOf(key) >= 0) {
                newExcluded = shaveHeads(excluded, key);
                it[key] = filterItems(doc[key], filterSubDoc, newExcluded);
            } else if (excluded.indexOf(key) === -1) {
                it[key] = doc[key];
            } else if (key.indexOf('.') > 0) {
                var head = key.split('.')[0];
                newExcluded = shaveHeads(excluded, head);

                it[head] = filterItems(doc[head], filterSubDoc, newExcluded);
            }
        }

        return it;
    }

    function filterItem(item, customExclude) {
        // just deleting the excluded keys from item does
        // not modify the object. therefore we build a copy
        var head, newExcluded,
            excluded = customExclude || excludedKeys,
            excludedarr = excluded.split(','),
            it = {},
            versionKey = model.schema.options.versionKey;

        if (versionKey) {
            it[versionKey] = item[versionKey];
        }

        if (item._id) {
            it._id = item._id;
        }

        for (var path in model.schema.paths) {
            if (path.indexOf('.') > 0) {
                head = path.split('.')[0];
                newExcluded = shaveHeads(excludedarr, head);

                it[head] = filterItems(item[head], filterSubDoc, newExcluded);
            } else if (model.schema.paths[path].schema) {
                newExcluded = shaveHeads(excludedarr, path);

                it[path] = filterItems(item[path], filterSubDoc, newExcluded);
            } else if (excludedarr.indexOf(path) === -1) {
                it[path] = item[path];
            }
        }
        return it;
    }

    function filterItems(items, filterFn, customExclude) {
        if (items instanceof Array) {
            return items.map(function (item) {
                return filterFn(item, customExclude);
            });
        } else {
            return filterFn(items, customExclude);
        }
    }

    function findExcludedFieldsFor(fullField) {
        var fieldArray = fullField.split('.'),
            prefix = fieldArray.slice(1).join('.'),
            currSchema = model.schema;

        for (var i = 0; i < fieldArray.length - 1; ++i) {
            currSchema = currSchema.path(fieldArray[i]).schema;
        }

        var path = currSchema.path(fieldArray[fieldArray.length - 1]);
        var modelName = path.caster ?
          path.caster.options.ref : path.options.ref;

        if (!excludedMap[modelName])  { return; }

        var excluded = prefix === '' ?
            excludedMap[modelName] :
            excludedMap[modelName].split(',').map(function (ex) {
                return util.format('%s.%s', prefix, ex);
            }).join(',');

        return excluded;
    }

    function filterPopulated(resource, populated) {
        if (!populated) { return; }
        var popArray = populated.split(',');

        for (var i = 0; i < popArray.length; ++i) {
            var popFields = popArray[i].split('.'),
                excludedKeys = findExcludedFieldsFor(popArray[i]);
            if (!excludedKeys) { continue; }

            resource[popFields[0]] = filterItems(resource[popFields[0]],
                                          filterSubDoc,
                                          excludedKeys);
        }
    }

    this.getFilter = function (resource, populated) {
        var filtered = filterItems(resource, filterItem);
        filterPopulated(filtered, populated);
        return filtered;
    };

    this.modifyFilter = function (resource) {
        return filterItems(resource, filterItem);
    };
};
