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
    excludedMap[model.modelName] = excludedKeys;

    function filterItem(item, customExclude) {
        // just deleting the excluded keys from item does
        // not modify the object. therefore we build a copy
        var head, newExcluded,
            excluded = customExclude || excludedKeys;

        excluded.forEach(function (key) {
            if (key.indexOf('.') > 0) {
                var head = key.split('.')[0];
                if (!item[head]) {
                    return;
                }

                newExcluded = shaveHeads(excluded, head);
                item[head] = filterItems(item[head], newExcluded);
            } else {
                delete item[key];
            }
        });

        return item;
    }

    function filterItems(items, customExclude) {
        if (items instanceof Array) {
            return items.map(function (item) {
                if (item.toObject) {
                    item = item.toObject();
                }

                return filterItem(item, customExclude);
            });
        } else {
            if (items && items.toObject) {
                items = items.toObject();
            }
            return filterItem(items, customExclude);
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
            excludedMap[modelName].map(function (ex) {
                return util.format('%s.%s', prefix, ex);
            });

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
                                          excludedKeys);
        }
    }

    this.getFilter = function (resource, populated) {
        var filtered = filterItems(resource);

        if (filtered instanceof Array) {
            filtered.forEach(function (item) {
                filterPopulated(item, populated);
            });
        } else {
            filterPopulated(filtered, populated);
        }

        return filtered;
    };

    this.modifyFilter = function (resource) {
        return filterItems(resource);
    };
};
