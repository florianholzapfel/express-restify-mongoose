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

var filterjson = function (json, excludedkeys) {
    var excludedarr = excludedkeys.split(',');
    for (var i = 0; i < json.length; ++i) {
        for (var j = 0; j < excludedarr.length; ++j) {
            delete (json[i][excludedarr[j]]);
        }
    }
    return json;
};

var filterItem = function (item, model, excludedkeys) {
	// just deleting the excluded keys from item does
	// not modify the object. therefore we build a copy
	var excludedarr = excludedkeys.split(',');
	var it = {};

	for (var key in item) {
		if (key === '__v' || key === '_id') {
			it[key] = item[key];
		} else if (model.schema.paths.hasOwnProperty(key)) {
			if (excludedarr.indexOf(key) === -1) {
				it[key] = item[key];
			}
		}
	}
	return it;
};

var restify = function (app, model, options) {
    var usingExpress = true,
        queryOptions = {
            protected: ['skip', 'limit', 'sort', 'populate', 'select'],
            current: {}
        };

    if (!options) {
        options = { };
    }
    if (!options.prefix) {
        options.prefix = '/api';
    }
    if (typeof options.plural === 'undefined' ||
        options.plural === null) {
        options.plural = true;
    }
    if (!options.version) {
        options.version = '/v1';
    }
    if (options.exclude) {
        var exclude = options.exclude;
    }

    if (options.middleware) {
        if (!options.middleware instanceof Array) {
            var m = options.middleware;
            options.middleware = [ m ];
        }
    } else {
        options.middleware = [];
    }

    var cleanQuery = function (req, res, next) {
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
    };

    options.middleware.unshift(cleanQuery);

    // Support restify vs express
    if (!app.delete && app.del) {
        // TODO: find a better way to make this determination
        usingExpress = false;
        app.delete = app.del;
    }

    var apiUri = options.plural === true ? '%s%s/%ss' : '%s%s/%s';

    var uri_items = util.format(apiUri, options.prefix, options.version,
        model.modelName);
    var uri_item = util.format(apiUri + '/:id', options.prefix, options.version,
        model.modelName);
    var uri_count = util.format(apiUri + '/count', options.prefix,
        options.version, model.modelName);


    var buildQuery = function (query, options) {
        var arr, i, re;
        for (var key in options) {
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
    };

    var ensureContentType = function (req, res, next) {
        var ct = req.headers['content-type'];
        if (-1 === ct.indexOf('application/json')) {
            res.send(400, 'Bad request');
        } else {
            next();
        }
    };

    var createObject = function (req, res) {
        model.create(req.body, function (err, item) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                if (usingExpress) {
                    res.type('json');
                }
				if (exclude) {
					item = filterItem(item, model, exclude);
				}
                res.send(usingExpress ? JSON.stringify(item) : item);
            }
        });
    };

    var modifyObject = function (req, res) {
        delete req.body._id;
        delete req.body.__v;

        model.findOneAndUpdate({ _id: req.params.id }, req.body, {},
            function (err, item) {
                if (err) {
                    res.send(404);
                } else {
                    if (usingExpress) {
                        res.type('json');
                    }
					if (exclude) {
						item = filterItem(item, model, exclude);
					}
                    res.send(usingExpress ? JSON.stringify(item) : item);
                }
            });
    };

    var write_middleware = options.middleware.slice(0);
    write_middleware.push(ensureContentType);

    app.get(uri_items, options.middleware, function (req, res) {
        buildQuery(model.find(), req.query).lean().exec(function (err, items) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                if (usingExpress) {
                    res.type('json');
                }
                if (exclude) {
                    items = filterjson(items, exclude);
                }
                res.send(usingExpress ? JSON.stringify(items) : items);
            }
        });
    });
    app.get(uri_count, options.middleware, function (req, res) {
        buildQuery(model.count(), req.query).exec(function (err, count) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                if (usingExpress) {
                    res.type('json');
                }
                var countObj = { count: count };
                res.send(usingExpress ? JSON.stringify(countObj) : countObj);
            }
        });
    });

    app.post(uri_items, write_middleware, createObject);

    //TODO: PUT (update) doesn't make a lot of sense here unless it can be used
    // to update multiple documents at one time
    app.put(uri_items, write_middleware, createObject);

    // TODO: reconsider this function
    app.delete(uri_items, options.middleware, function (req, res) {
        buildQuery(model.find(), req.query).remove(function (err) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                res.send(200);
            }
        });
    });

    app.get(uri_item, options.middleware, function (req, res) {
        buildQuery(model.findById(req.params.id), req.query)
            .findOne(function (err, item) {
            if (err || !item) {
                res.send(404);
            } else {
                if (usingExpress) {
                    res.type('json');
                }
				if (exclude) {
					item = filterItem(item, model, exclude);
				}
                res.send(usingExpress ? JSON.stringify(item) : item);
            }
        });
    });

    // TODO: POST (create) doesn't make sense here
    app.post(uri_item, write_middleware, modifyObject);

    app.put(uri_item, write_middleware, modifyObject);

    app.delete(uri_item, options.middleware, function (req, res) {
        model.remove({ _id: req.params.id }, function (err) {
            if (err) {
                res.send(404);
            } else {
                res.send(200);
            }
        });
    });
};

module.exports.serve = restify;
