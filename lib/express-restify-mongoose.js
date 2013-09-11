/**
 * express-restify-mongoose.js
 *
 * Copyright (C) 2013 by Florian Holzapfel
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 **/
var util = require('util');

function filterjson(json, excludedkeys) {
    var excludedarr = excludedkeys.split(',');
    for (var i = 0; i < json.length; ++i) {
        for (var j = 0; j < excludedarr.length; ++j) {
            delete (json[i][excludedarr[j]]);
        }
    }
    return json;
}

function filterItem(item, model, excludedkeys) {
	// just deleting the excluded keys from item does
	// not modify the object. therefore we build a copy
	var excludedarr = excludedkeys.split(',');
	var it = {};

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

function outputExpress(res, result) {
    res.type('json');
    res.send(JSON.stringify(result));
}

function outputRestify(res, result) {
    res.send(result);
}

var restify = function (app, model, options) {
    var postProcess, exclude,
        usingExpress = true,
        queryOptions = {
            protected: ['skip', 'limit', 'sort', 'populate', 'select'],
            current: {}
        };

    options         = options || {};
    options.prefix  = options.prefix || '/api';
    options.version = options.version || '/v1';
    postProcess     = options.postProcess || function () {};
    exclude         = options.exclude;

    if (options.plural !== false) {
        options.plural = true;
    }

    if (options.middleware) {
        if (!options.middleware instanceof Array) {
            var m = options.middleware;
            options.middleware = [ m ];
        }
    } else {
        options.middleware = [];
    }

    function cleanQuery(req, res, next) {
        queryOptions.current = {};
        for (var key in req.query) {
            if (!model.schema.paths.hasOwnProperty(key)) {
                if (queryOptions.protected.indexOf(key) !== -1) {
                    queryOptions.current[key] = req.query[key];
                }
                delete req.query[key];
            }
        }
        next();
    }

    options.middleware.unshift(cleanQuery);
    
    var outputFn = options.restify ? outputRestify : outputExpress;
    app.delete = app.del;

    var apiUri = options.plural === true ? '%s%s/%ss' : '%s%s/%s';
    var modelName = options.lowercase === true ? model.modelName.toLowerCase()
                        : model.modelName;

    var uri_items = util.format(apiUri, options.prefix, options.version,
        modelName);
    var uri_item = util.format(apiUri + '/:id', options.prefix, options.version,
        modelName);
    var uri_count = util.format(apiUri + '/count', options.prefix,
        options.version, modelName);

    function buildQuery(query, options) {
        var excludedarr = exclude ? exclude.split(',') : [];

        var arr, i, re;
        for (var key in options) {
            if (excludedarr.indexOf(key) !== -1) {
                // caller tries to query for excluded keys. for security
                // reasons, we will skip the first -1 objects (to provoke
                // an error) and immediately return
                return query.skip(-1);
            }

            query.where(key);
            var value = options[key];

            if ('~' === value[0]) {
                re = new RegExp(value.substring(1), 'i');
                query.where(key).regex(re);
            } else if ('>' === value[0]) {
                if ('=' === value[1]) {
                    query.gte(value.substr(2));
                } else {
                    query.gt(value.substr(1));
                }
            } else if ('<' === value[0]) {
                if ('=' === value[1]) {
                    query.lte(value.substr(2));
                } else {
                    query.lt(value.substr(1));
                }
            } else {
                query.equals(value);
            }
        }

        if (queryOptions.current.skip) {
            query.skip(queryOptions.current.skip);
        }
        if (queryOptions.current.limit) {
            query.limit(queryOptions.current.limit);
        }
        if (queryOptions.current.sort) {
            query.sort(queryOptions.current.sort);
        }
        if (queryOptions.current.populate) {
            arr = queryOptions.current.populate.split(',');
            for (i = 0; i < arr.length; ++i) {
                query = query.populate(arr[i]);
            }
        }
        if (queryOptions.current.select) {
            var selectObj = {};
            if (queryOptions.current.select) {
                arr = queryOptions.current.select.split(',');
                for (i = 0; i < arr.length; ++i) {
                    selectObj[arr[i]] = 1;
                }
            }
            query = query.select(selectObj);
        }
        return query;
    }

    function ensureContentType(req, res, next) {
        var ct = req.headers['content-type'];
        if (-1 === ct.indexOf('application/json')) {
            res.send(400, 'Bad request');
        } else {
            next();
        }
    }

    function createObject(req, res, next) {
        delete req.body._id;
        if (model.schema.options.versionKey) {
            delete req.body[model.schema.options.versionKey];
        }
        
        var key, path;
        
        if (Array.isArray(req.body)) {
            for (var i = 0; i < req.body.length; ++i) {
                for (key in req.body[i]) {
                    path = model.schema.path(key);
                    if ((path.instance === 'ObjectID') &&
                        (typeof req.body[i][key] === 'object')) {
                        req.body[i][key] = req.body[i][key]._id;
                    }
                }
            }
        } else {
            for (key in req.body) {
                path = model.schema.path(key);
                if (typeof path === 'undefined') {
                    continue;
                }
                if ((path.instance === 'ObjectID') &&
                    (typeof req.body[key] === 'object')) {
                    req.body[key] = req.body[key]._id;
                }
            }
        }

        model.create(req.body, function (err, item) {
            if (err) {
                res.setHeader('Content-Type', 'application/json');
                res.send(400, JSON.stringify(err));
            } else {
                var result = null;
                
                if (Array.isArray(req.body)) {
                    var items = Array.prototype.slice.call(arguments, 1);

                    if (exclude) {
                        result = [];
                        for (var i = 0; i < items.length; ++i) {
                            result.push(filterItem(items[i], model, exclude));
                        }
                    } else {
                        result = items;
                    }
                } else {
                    result = exclude ? filterItem(item, model, exclude) : item;
                }
                
                outputFn(res, result);
                next();
            }
        });
    }

    function modifyObject(req, res, next) {
        delete req.body._id;
        if (model.schema.options.versionKey) {
            delete req.body[model.schema.options.versionKey];
        }

        for (var key in req.body) {
            var path = model.schema.path(key);
            if (typeof path === 'undefined') {
                continue;
            }
            if ((path.instance === 'ObjectID') &&
               (typeof req.body[key] === 'object')) {
                req.body[key] = req.body[key]._id;
            }
        }

        model.findOneAndUpdate({ _id: req.params.id }, req.body, {},
            function (err, item) {
                if (err) {
                    res.send(404);
                } else {
					if (exclude) {
						item = filterItem(item, model, exclude);
					}
                    outputFn(res, item);
                    next();
                }
            });
    }

    var write_middleware = options.middleware.slice(0);
    write_middleware.push(ensureContentType);

    app.get(uri_items, options.middleware, function (req, res, next) {
        buildQuery(model.find(), req.query).lean().exec(function (err, items) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                if (exclude) {
                    items = filterjson(items, exclude);
                }
                outputFn(res, items);
                next();
            }
        });
    }, postProcess);

    app.get(uri_count, options.middleware, function (req, res, next) {
        buildQuery(model.count(), req.query).exec(function (err, count) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                outputFn(res, { count: count });
                next();
            }
        });
    }, postProcess);

    app.post(uri_items, write_middleware, createObject, postProcess);
    app.put(uri_items, write_middleware, createObject, postProcess);

    // TODO: reconsider this function
    app.delete(uri_items, options.middleware, function (req, res, next) {
        buildQuery(model.find(), req.query).remove(function (err) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                res.send(200);
                next();
            }
        });
    }, postProcess);

    app.get(uri_item, options.middleware, function (req, res, next) {
        buildQuery(model.findById(req.params.id), req.query)
            .findOne(function (err, item) {
            if (err || !item) {
                res.send(404);
            } else {
				if (exclude) {
					item = filterItem(item, model, exclude);
				}
                outputFn(res, item);
                next();
            }
        });
    }, postProcess);

    // TODO: POST (create) doesn't make sense here
    app.post(uri_item, write_middleware, modifyObject, postProcess);

    app.put(uri_item, write_middleware, modifyObject, postProcess);

    app.delete(uri_item, options.middleware, function (req, res, next) {
        model.remove({ _id: req.params.id }, function (err) {
            if (err) {
                res.send(404);
            } else {
                res.send(200);
                next();
            }
        });
    }, postProcess);
};

module.exports.serve = restify;
