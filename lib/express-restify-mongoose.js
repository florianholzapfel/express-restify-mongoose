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
'use strict';

var util = require('util'),
    Filter = require('./resource_filter'),
    permissions = require('./permissions'),
    _ = require('lodash'),
    inflection = require('inflection'),
    http = require('http'),
    customDefaults = null;

function getDefaults() {
    var options = {};

    _.defaults(options, customDefaults, {
        prefix: '/api',
        version: '/v1',
        private: false,
        lean: true,
        plural: true,
        middleware: [],
        findOneAndUpdate: true,
        findOneAndRemove: true,
        contextFilter: null,
        postCreate: null
    });

    return options;
}

function outputExpress(req, res, data) {
    if (data.result !== null) {
        res.status(data.statusCode || 200).json(data.result);
    } else {
        res.status(data.statusCode || 200).end();
    }
}

function outputRestify(req, res, data) {
    if (data.result !== null) {
        res.send(data.statusCode || 200, data.result);
    } else {
        res.send(data.statusCode || 200);
    }
}

var restify = function(app, model, opts) {
    var postProcess, lean, filter, contextFilter, postCreate, postDelete,
        usingExpress,
        options = getDefaults(),
        queryOptions = {
            protected: ['skip', 'limit', 'sort', 'distinct', 'populate', 'select', 'lean',
                '$and', '$or', 'query', 'projection'],//H+ exposes OR, AND and WHERE methods
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

    model.schema.eachPath(function(name, path) {
        if (path.options.access) {
            switch (path.options.access.toLowerCase()) {
                case 'private':
                    options.private.push(name);
                    break;
                case 'protected':
                    options.protected.push(name);
                    break;
            }
        }
    });

    if (options.exclude) {
        options.private = options.exclude.split(',');
        console.error('Exclude is deprecated. Use private instead');
    }

    lean = options.lean;
    filter = new Filter(model, options.private, options.protected);
    postProcess = options.postProcess || function() {
    };

    if (options.middleware) {
        if (!(options.middleware instanceof Array)) {
            var m = options.middleware;
            options.middleware = [ m ];
        }
    }

    function cleanQuery(req, res, next) {
        queryOptions.current = {};
        queryOptions.clean = _.clone(req.query);
        var err = null;
        for (var key in queryOptions.clean) {
            if (queryOptions.protected.indexOf(key) !== -1) {
                queryOptions.current[key] = queryOptions.clean[key];
                delete queryOptions.clean[key];
            } else if (!model.schema.paths.hasOwnProperty(key)) {
                var keys = key.match('.') &&
                    !model.schema.paths.hasOwnProperty(key) ?
                        key.split('.') : false;
                if(!keys || !model.schema.paths.hasOwnProperty(keys[0]) ||
                    !model.schema.paths[keys[0]].schema.paths.hasOwnProperty(keys[1]) ||
                    keys.length > 2) {

                    if(!model.schema.virtuals.hasOwnProperty(keys[0])) {
                        err = new Error(http.STATUS_CODES[400]);
                        err.status = 400;
                        break;
                    }
                }
            }
        }

        if(err) {
            onError(err, req, res, next);
        } else {
            next();
        }
    }

    usingExpress = !options.restify;

    var onError = options.onError ? options.onError : function(err, req, res, next) {
        var errorString;
    	res.setHeader('Content-Type', 'application/json');
    	errorString = JSON.stringify(err);

        if (usingExpress) {
            res.status(err.status).send(errorString);
        } else {
            res.send(err.status, errorString);
        }
    };

    options.middleware.push(cleanQuery);

    var outputFn = options.outputFn ?
        options.outputFn : (options.restify ?
        outputRestify : outputExpress);
    if(undefined === app.delete) {
        app.delete = app.del;
    }
    var apiUri = '%s%s/%s';

    var modelName;

    if (options.name) {
        modelName = options.name;
    }
    else {
        modelName = model.modelName;
    }
    modelName = options.plural ? inflection.pluralize(modelName)
            : modelName;

    modelName = options.lowercase === true ? modelName.toLowerCase()
        : modelName;

    var uri_item = util.format(apiUri, options.prefix, options.version,
        modelName);
    if (uri_item.indexOf('/:id') === -1) {
        uri_item += '/:id';
    }
    var uri_items = uri_item.replace('/:id', '');

    var uri_count = uri_items + '/count';
    var uri_shallow = uri_item + '/shallow';

    function findById(filteredContext, id) {
        if (options.idProperty || !filteredContext.findById) {
            var byId = {};
            byId[options.idProperty || '_id'] = id;
            return filteredContext.findOne().and(byId);
        } else {
            return filteredContext.findById(id);
        }
    }

    function buildQuery(query, req) {
        var options = queryOptions.clean,
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
            } else if ('!' === value[0] && '=' === value[1]) { //H+ for !=
                query.ne(value.substr(2));
            } else if ('[' === value[0] && ']' === value[value.length - 1]) {
                query.in(value.substr(1, value.length - 2).split(','));
            } else if('=' === value[0]) {
                query.equals(value.substring(1));
            } else {
                query.equals(value);
            }
        }

        //H+ exposes Query AND, OR and WHERE methods
        if (queryOptions.current.query) {
            query.where(JSON.parse(queryOptions.current.query,
                jsonQueryParser));
        }
        //TODO - as introduction of QUERY param obsoletes need of $and, $or
        if (queryOptions.current.$and) {
            query.and(JSON.parse(queryOptions.current.$and, jsonQueryParser));
        }
        if (queryOptions.current.$or) {
            query.or(JSON.parse(queryOptions.current.$or, jsonQueryParser));
        }
        //H+ exposes Query AND, OR methods

        if (queryOptions.current.skip) {
            query.skip(queryOptions.current.skip);
        }
        if (queryOptions.current.limit) {
            query.limit(queryOptions.current.limit);
        }
        if (queryOptions.current.sort) {
            try {
                query.sort(JSON.parse(queryOptions.current.sort));
            } catch (e) {
                query.sort(queryOptions.current.sort);
            }
        }
        var selectObj = {root: {}};
        if (queryOptions.current.select) {
            arr = queryOptions.current.select.split(',');
            for (i = 0; i < arr.length; ++i) {
                var selectItem = arr[i];
                var selectionModifier = 1;
                if (selectItem.match(/^\-/)) { // exclusion
                    selectItem = selectItem.substring(1);
                    selectionModifier = 0;
                }
                if (selectItem.match(/\./)) {
                    var subSelect = selectItem.split('.');
                    if (!selectObj[subSelect[0]]) {
                        selectObj[subSelect[0]] = {};
                    }
                    selectObj[subSelect[0]][subSelect[1]] = selectionModifier;
                } else {
                    selectObj.root[selectItem] = selectionModifier;
                }
            }
            query = query.select(selectObj.root);
        }
        if (queryOptions.current.populate) {
            arr = queryOptions.current.populate.split(',');
            for (i = 0; i < arr.length; ++i) {
                if (!_.isUndefined(selectObj[arr[i]]) &&
                    !_.isEmpty(selectObj.root)) {
                    selectObj.root[arr[i]] = 1;
                }
                query = query.populate(arr[i], selectObj[arr[i]]);
            }
            query.select(selectObj.root);
        }
        if (queryOptions.current.projection) {
            query.select(JSON.parse(queryOptions.current.projection, jsonQueryParser));
        }
		if (queryOptions.current.distinct) {
			query.distinct(queryOptions.current.distinct);
		}
        return query;
    }

    //H+ - JSON query param parser
    //TODO - improve to serve recursive logical operators
    function jsonQueryParser(key, value) {
        if (_.isString(value)) {
            if ('~' === value[0]) { //parse RegExp
                return new RegExp(value.substring(1), 'i');
            } else if ('>' === value[0]) {
                if ('=' === value[1]) {
                    return {$gte: value.substr(2)};
                } else {
                    return {$gt: value.substr(1)};
                }
            } else if ('<' === value[0]) {
                if ('=' === value[1]) {
                    return {$lte: value.substr(2)};
                } else {
                    return {$lt: value.substr(1)};
                }
            } else if ('!' === value[0] && '=' === value[1]) {
                return {$ne: value.substr(2)};
            } else if('=' === value[0]) {
                return {$eq: value.substring(1)};
            }
        } else if (_.isArray(value)) {
            if (model.schema.paths.hasOwnProperty(key)) {
                return {$in: value};
            }
        }
        return value;
    }

    //H+ - JSON query param parser

    function ensureContentType(req, res, next) {
        var ct = req.headers['content-type'];
        if (!ct || (-1 === ct.indexOf('application/json'))) {
            var err = new Error(http.STATUS_CODES[400]);
            err.status = 400;
            onError(err, req, res, next);
        } else {
            next();
        }
    }

    function createSingleObject(body) {
        for (var key in body) {
            var path = model.schema.path(key);
            if (typeof path === 'undefined') {
                continue;
            }

            if (path.caster !== undefined) {
                if (path.caster.instance === 'ObjectID') {
                    if (_.isArray(body[key])) {
                        for (var k = 0; k < body[key].length; ++k) {
                            if (typeof body[key][k] === 'object') {
                                body[key][k] = body[key][k]._id;
                            }
                        }
                    } else if ((typeof body[key] === 'object') &&
                        (body[key] !== null)) {
                        body[key] = body[key]._id;
                    }
                }
            } else if ((path.instance === 'ObjectID') &&
                (typeof body[key] === 'object') &&
                (body[key] !== null)) {
                body[key] = body[key]._id;
            }
        }
    }

    function createObject(req, res, next) {
        if (!req.body) {
            var err = new Error(http.STATUS_CODES[400]);
            err.status = 400;
            onError(err, req, res, next);
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

        if (_.isArray(req.body)) {
            for (var i = 0; i < req.body.length; ++i) {
                createSingleObject(req.body[i]);
            }
        } else {
            createSingleObject(req.body);
        }

        model.create(req.body, function(err, item) {
            if (err) {
                err.status = 400;
                onError(err, req, res, next);
            } else {
                var result = null;

                result = filter.filterObject(item, filterOpts);

                postCreate(res, result, function(err) {
                    if (err) {
                        err.status = err.status || 400;
                        onError(err, req, res, next);
                    }
                    else {
                        // 201 - Created
                        outputFn(req, res, {
                          result: result,
                          statusCode: 201
                        });
                        next();
                    }
                });
            }
        });
    }

    function modifyObject(req, res, next) {
        if (!req.body) {
            var err = new Error(http.STATUS_CODES[400]);
            err.status = 400;
            onError(err, req, res, next);
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

            if (path.caster !== undefined) {
                if (path.caster.instance === 'ObjectID') {
                    if (_.isArray(req.body[key])) {
                        for (var j = 0; j < req.body[key].length; ++j) {
                            if (typeof req.body[key][j] === 'object') {
                                req.body[key][j] = req.body[key][j]._id;
                            }
                        }
                    } else if ((typeof req.body[key] === 'object') &&
                        (req.body[key] !== null)) {
                        req.body[key] = req.body[key]._id;
                    }
                }
            } else if ((path.instance === 'ObjectID') &&
                (typeof req.body[key] === 'object') &&
                (req.body[key] !== null)) {
                req.body[key] = req.body[key]._id;
            }
        }

        if (options.findOneAndUpdate) {
            contextFilter(model, req, function(filteredContext) {
                findById(filteredContext, req.params.id).findOneAndUpdate({}, req.body, {
                    new: true
                }, function(err, item) {
                    if (err) {
                        err.status = 400;
                        onError(err, req, res, next);
                    } else if (!item) {
                        err = new Error(http.STATUS_CODES[404]);
                        err.status = 404;
                        onError(err, req, res, next);
                    } else {
                        item = filter.filterObject(item, filterOpts);
                        outputFn(req, res, {
                          result: item,
                          statusCode: 200
                        });
                        next();
                    }
                });
            });
        } else {
            contextFilter(model, req, function(filteredContext) {
                findById(filteredContext, req.params.id).exec(function(err, doc) {
                    if (err) {
                        err.status = 400;
                        onError(err, req, res, next);
                    } else if (!doc) {
                        err = new Error(http.STATUS_CODES[404]);
                        err.status = 404;
                        onError(err, req, res, next);
                    } else {
                        for (var key in req.body) {
                            doc[key] = req.body[key];
                        }
                        doc.save(function(err, item) {
                            if (err) {
                                err.status = 400;
                                onError(err, req, res, next);
                            } else {
                                item = filter.filterObject(item, filterOpts);
                                outputFn(req, res, {
                                  result: item,
                                  statusCode: 200
                                });
                                next();
                            }
                        });
                    }
                });
            });
        }
    }

    var write_middleware = options.middleware.slice(0, -1);

    if (options.prereq) {
        var allowMW = permissions.allow(options.prereq, onError);
        write_middleware = [allowMW].concat(write_middleware);
    }

    var delete_middleware = write_middleware.slice(0);

    if (options.access) {
        var accessMW = permissions.access(options.access, onError);
        options.middleware.push(accessMW);
        write_middleware.push(accessMW);
    }

    write_middleware.push(ensureContentType);

    if (options.contextFilter) {
        contextFilter = options.contextFilter;
    }
    else {
        contextFilter = function(model, req, done) {
            done(model);
        };
    }
    if (options.postCreate) {
        postCreate = options.postCreate;
    }
    else {
        postCreate = function(res, result, done) {
            done();
        };
    }
    if (options.postDelete) {
        postDelete = options.postDelete;
    }
    else {
        postDelete = function(res, result, done) {
            done();
        };
    }

    app.get(uri_items, options.middleware, function(req, res, next) {
        contextFilter(model, req, function(filteredContext) {
            buildQuery(filteredContext.find(), req).lean(lean)
                .exec(function(err, items) {
                    if (err) {
                        err.status = 400;
                        onError(err, req, res, next);
                    } else {
                        var populate = queryOptions.current.populate,
                            opts = {
                                populate: populate,
                                access: req.access
                            };

                        try {
                            items = filter.filterObject(items, opts);
                            outputFn(req, res, {
                              result: items,
                              statusCode: 200
                            });
                            next();
                        } catch(e) {
                            e.status = 400;
                            onError(e, req, res, next);
                        }
                    }
                });
        });
    }, postProcess);

    app.get(uri_count, options.middleware, function(req, res, next) {
        contextFilter(model, req, function(filteredContext) {
            buildQuery(filteredContext.count(), req).exec(function(err, count) {
                if (err) {
                    err.status = 400;
                    onError(err, req, res, next);
                } else {
                    outputFn(req, res, {
                      result: { count: count },
                      statusCode: 200
                    });
                    next();
                }
            });
        });
    }, postProcess);

    app.get(uri_shallow, options.middleware, function(req, res, next) {
        contextFilter(model, req, function(filteredContext) {
            buildQuery(findById(filteredContext, req.params.id), req).lean(lean)
                .exec(function(err, item) {
                    if (err) {
                        err.status = 400;
                        onError(err, req, res, next);
                    } else if (!item) {
                        err = new Error(http.STATUS_CODES[404]);
                        err.status = 404;
                        onError(err, req, res, next);
                    } else {
                        var populate = queryOptions.current.populate,
                            opts = {
                                populate: populate,
                                access: req.access
                            };

                        try {
                            item = filter.filterObject(item, opts);
                            for(var prop in item) {
                                item[prop] = typeof item[prop] === 'object' && prop !== '_id' ?
                                    true : item[prop];
                            }

                            outputFn(req, res, {
                              result: item,
                              statusCode: 200
                            });
                            next();
                        } catch(e) {
                            e.status = 400;
                            onError(e, req, res, next);
                        }
                    }
                });
        });
    }, postProcess);

    app.post(uri_items, write_middleware, createObject, postProcess);

    app.delete(uri_items, delete_middleware, function(req, res, next) {
        contextFilter(model, req, function(filteredContext) {
            buildQuery(filteredContext.find(), req).remove(function(err, items) {
                if (err) {
                    err.status = 400;
                    onError(err, req, res, next);
                } else {
                    // 204 - No Content
                    outputFn(req, res, {
                      statusCode: 204
                    });
                    next();
                }
            });
        });
    }, postProcess);

    app.get(uri_item, options.middleware, function(req, res, next) {
        contextFilter(model, req, function(filteredContext) {
            buildQuery(findById(filteredContext, req.params.id), req).lean(lean)
                .exec(function(err, item) {
                    if (err) {
                        err.status = 400;
                        onError(err, req, res, next);
                    } else if (!item) {
                        err = new Error(http.STATUS_CODES[404]);
                        err.status = 404;
                        onError(err, req, res, next);
                    } else {
                        var populate = queryOptions.current.populate,
                            opts = {
                                populate: populate,
                                access: req.access
                            };

                        try {
                            item = filter.filterObject(item, opts);

                            // if null 404 - not found else 200
                            var statusCode = item ? 200 : 404;
                            outputFn(req, res, {
                              result: item,
                              statusCode: statusCode
                            });
                            next();
                        } catch(e) {
                            e.status = 400;
                            onError(e, req, res, next);
                        }
                    }
                });
        });
    }, postProcess);

    app.post(uri_item, write_middleware, modifyObject, postProcess);
    app.put(uri_item, write_middleware, modifyObject, postProcess);

    app.delete(uri_item, delete_middleware, function(req, res, next) {
        var byId = {};
        byId[options.idProperty || '_id'] = req.params.id;

        if (options.findOneAndRemove) {
            contextFilter(model, req, function(filteredContext) {
                findById(filteredContext, req.params.id).findOneAndRemove(function(err, result) {
                    if (err) {
                        err.status = 400;
                        onError(err, req, res, next);
                    } else if (!result) {
                        err = new Error(http.STATUS_CODES[404]);
                        err.status = 404;
                        onError(err, req, res, next);
                    } else {
                        postDelete(res, result, function(err) {
                            if (err) {
                                err.status = err.status || 400;
                                onError(err, req, res, next);
                            }
                            else {
                                // 204 - No Content
                                outputFn(req, res, {
                                  statusCode: 204
                                });
                                next();
                            }
                        });
                    }
                });
            });
        } else {
            contextFilter(model, req, function(filteredContext) {
                findById(filteredContext, req.params.id).exec(function(err, doc) {
                    if (err) {
                        err.status = 400;
                        onError(err, req, res, next);
                    } else if (!doc) {
                        err = new Error(http.STATUS_CODES[404]);
                        err.status = 404;
                        onError(err, req, res, next);
                    } else {
                        doc.remove(function(err, result) {
                            postDelete(res, doc, function(err) {
                                if (err) {
                                    err.status = err.status || 400;
                                    onError(err, req, res, next);
                                }
                                else {
                                    // 204 - No Content
                                    outputFn(req, res, {
                                      statusCode: 204
                                    });
                                    next();
                                }
                            });
                        });
                    }
                });
            });
        }
    }, postProcess);
};



module.exports.defaults = function(options) {
    customDefaults = options;
};
module.exports.serve = restify;
