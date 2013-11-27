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
var util = require('util'),
    Filter = require('./resource_filter'),
    permissions = require('./permissions'),
    customDefaults = null;

function getDefaults() {
    var options = {
        prefix: '/api',
        version: '/v1',
        private: false,
        lean: true,
        plural: true,
        middleware: [],
        strict: false,
        findOneAndUpdate: true
    };

    for (var prop in customDefaults) {
        options[prop] = customDefaults[prop];
    }

    return options;
}

function outputExpress(res, result) {
    res.type('json');
    res.send(JSON.stringify(result));
}

function outputRestify(res, result) {
    res.send(result);
}

var restify = function (app, model, opts) {
    var postProcess, lean, filter,
        usingExpress = true,
        options = getDefaults(),
        queryOptions = {
            protected: ['skip', 'limit', 'sort', 'populate', 'select', 'lean'],
            current: {}
        };

    for (var prop in opts) {
        if (opts[prop] instanceof Array) {
            options[prop] = [];
            for (var index in opts[prop]) {
                options[prop][index] = opts[prop][index];
            }
        } else {
            options[prop] = opts[prop];
        }
    }

    options.private = options.private ? options.private.split(',') : [];
    options.protected = options.protected ?
        options.protected.split(',') : [];

    if (options.exclude) {
        options.private = options.exclude.split(',');
        console.error('Exclude is deprecated. Use private instead');
    }

    lean = options.lean;
    filter = new Filter(model, options.private, options.protected);
    postProcess = options.postProcess || function () {};

    if (options.middleware) {
        if (!(options.middleware instanceof Array)) {
            var m = options.middleware;
            options.middleware = [ m ];
        }
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

    function buildQuery(query, req) {
        var options = req.query,
            excludedarr = filter.getExcluded(req.access);

        var arr, i, re;
        for (var key in options) {
            if (excludedarr.indexOf(key) !== -1) {
                // caller tries to query for excluded keys. for security
                // reasons, we will skip the first -1 objects (to provoke
                // an error) and immediately return;
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
            } else if ('[' === value[0] && ']' === value[value.length - 1]) {
                query.in(value.substr(1, value.length - 2).split(','));
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
        var selectObj = {root: {}};
        if (queryOptions.current.select) {

            if (queryOptions.current.select) {
                arr = queryOptions.current.select.split(',');
                for (i = 0; i < arr.length; ++i) {
                    if (arr[i].match(/\./)) {
                        var subSelect = arr[i].split('.');
                        if (!selectObj[subSelect[0]]) {
                            selectObj[subSelect[0]] = {};
                            selectObj.root[subSelect[0]] = 1;
                        }
                        selectObj[subSelect[0]][subSelect[1]] = 1;
                    } else {
                        selectObj.root[arr[i]] = 1;
                    }
                }
            }
            query = query.select(selectObj.root);
        }
        if (queryOptions.current.populate) {
            arr = queryOptions.current.populate.split(',');
            for (i = 0; i < arr.length; ++i) {
                query = query.populate(arr[i], selectObj[arr[i]]);
            }
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
        if (!req.body) {
            res.send(400, 'Received an empty body');
            return;
        }

        var filterOpts = { access: req.access };
        req.body = filter.filterObject(req.body, filterOpts);
        if (model.schema.options._id) {
            delete req.body._id;
        }
        if (model.schema.options.versionKey) {
            delete req.body[model.schema.options.versionKey];
        }

        var key, path;

        if (Array.isArray(req.body)) {
            for (var i = 0; i < req.body.length; ++i) {
                for (key in req.body[i]) {
                    path = model.schema.path(key);
                    if ((path.instance === 'ObjectID') &&
                        (typeof req.body[i][key] === 'object') &&
                        (req.body[i][key] !== null)) {
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
                    (typeof req.body[key] === 'object') &&
                    (req.body[key] !== null)) {
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

                    result = filter.filterObject(items, filterOpts);
                } else {
                    result = filter.filterObject(item, filterOpts);
                }

                outputFn(res, result);
                next();
            }
        });
    }

    function modifyObject(req, res, next) {
        if (!req.body) {
            res.send(400, 'Received an empty body');
            return;
        }
        
        var filterOpts = { access: req.access };
        req.body = filter.filterObject(req.body, filterOpts);

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
               (typeof req.body[key] === 'object') &&
                (req.body[key] !== null)) {
                req.body[key] = req.body[key]._id;
            }
        }

        if (options.findOneAndUpdate) {
            model.findOneAndUpdate({ _id: req.params.id }, req.body, {},
                function (err, item) {
                    if (err) {
                        res.send(404);
                    } else {
                        item = filter.filterObject(item, filterOpts);
                        outputFn(res, item);
                        next();
                    }
                });
        } else {
            model.findById(req.params.id, function (err, doc) {
                if (err) {
                    res.send(404);
                } else {
                    for (var key in req.body) {
                        doc[key] = req.body[key];
                    }
                    doc.save(function (err, item) {
                        if (err) {
                            res.send(404);
                        } else {
                            item = filter.filterObject(item, filterOpts);
                            outputFn(res, item);
                            next();
                        }
                    });
                }
            });
        }
    }

    var write_middleware = options.middleware.slice(0);

    if (options.prereq) {
        var allowMW = permissions.allow(options.prereq);
        write_middleware = [allowMW].concat(write_middleware);
    }

    var delete_middleware = write_middleware.slice(0);

    if (options.access) {
        var accessMW = permissions.access(options.access);
        options.middleware.push(accessMW);
        write_middleware.push(accessMW);
    }

    write_middleware.push(ensureContentType);

    app.get(uri_items, options.middleware, function (req, res, next) {
        buildQuery(model.find(), req).lean(lean)
        .exec(function (err, items) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                var populate = queryOptions.current.populate,
                    opts = {
                        populate: populate,
                        access: req.access
                    };

                items = filter.filterObject(items, opts);

                outputFn(res, items);
                next();
            }
        });
    }, postProcess);

    app.get(uri_count, options.middleware, function (req, res, next) {
        buildQuery(model.count(), req).exec(function (err, count) {
            if (err) {
                res.send(400, 'Bad request');
            } else {
                outputFn(res, { count: count });
                next();
            }
        });
    }, postProcess);

    app.post(uri_items, write_middleware, createObject, postProcess);

    if (!options.strict) {
        app.put(uri_items, write_middleware, createObject, postProcess);
    }

    if (!options.strict) {
        // TODO: reconsider this function
        app.delete(uri_items, delete_middleware, function (req, res, next) {
            buildQuery(model.find(), req).remove(function (err) {
                if (err) {
                    res.send(400, 'Bad request');
                } else {
                    res.send(200);
                    next();
                }
            });
        }, postProcess);
    }

    app.get(uri_item, options.middleware, function (req, res, next) {
        buildQuery(model.findById(req.params.id), req).lean(lean)
            .findOne(function (err, item) {

            if (err || !item) {
                res.send(404);
            } else {
                var populate = queryOptions.current.populate,
                    opts = {
                        populate: populate,
                        access: req.access
                    };

                item = filter.filterObject(item, opts);

                outputFn(res, item);
                next();
            }
        });
    }, postProcess);

    if (!options.strict) {
        // TODO: POST (create) doesn't make sense here
        app.post(uri_item, write_middleware, modifyObject, postProcess);
    }

    app.put(uri_item, write_middleware, modifyObject, postProcess);

    app.delete(uri_item, delete_middleware, function (req, res, next) {
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

module.exports.defaults = function (options) {
    customDefaults = options;
};
module.exports.serve = restify;
