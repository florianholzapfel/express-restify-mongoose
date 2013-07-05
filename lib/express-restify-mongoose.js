/**
 * express-restify-mongoose.js
 *
 * Copyright (C) 2013 by Florian Holzapfel
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 **/
 var util = require('util');

 var filterjson = function(json, excludedkeys) { 
 	excludedarr = excludedkeys.split(','); 
 	for(var i=0; i < json.length; ++i) { 
 		for(var j=0; j < excludedarr.length; ++j) { 
 			delete (json[i][excludedarr[j]])
 		
 		}
 	}
 	return json; 
 }

 var restify = function(app, model, options) {
 	if(!options) {
 		options = { };
 	}
 	if(!options.prefix) {
 		options.prefix = "/api";
 	}
 	if( ( typeof options.plural === "undefined" ) || ( options.plural === null ) ) {
 		options.plural = true
 	}
 	if(!options.version) {
 		options.version = "/v1";
 	}
 	if(options.exclude) { 
 		var exclude = options.exclude; 
 	}

 	if(options.middleware) {
 		if(!options.middleware instanceof Array) {
 			var m = options.middleware;
 			options.middleware = [ m ];
 		}
 	} else {
 		options.middleware = [];
 	}
 	options.middleware.unshift(cleanQuery);

 	var queryOptions = {protected: ["page", "perPage", "sort", "populate", "select"], current: {}};

 	var apiUri = options.plural === true ? "%s%s/%ss" : "%s%s/%s"

 	var uri_items = util.format(apiUri, options.prefix, options.version, model.modelName);
 	var uri_item = util.format(apiUri + '/:id', options.prefix, options.version, model.modelName);
 	var uri_count = util.format(apiUri + '/count/', options.prefix, options.version, model.modelName); 

 	function cleanQuery(req, res, next) {
 		queryOptions.current = {};
 		for(var key in req.query) {
 			if(!model.schema.paths.hasOwnProperty(key)) {
 				if(queryOptions.protected.indexOf(key) != -1) {
 					queryOptions.current[key] = req.query[key];
 				}
 				delete req.query[key];
 			}
 		}
 		next();
 	}

 	function buildQuery(query, options) {
 		for(var key in options) {
 			query.where(key);
 			var value = options[key];

 			if('~' == value[0]) {
 				re = new RegExp(value.substring(1), 'i'); 
 				query.where(key).regex(re);
 			} else if('>' == value[0]) {
 				if('=' == value[1]) {
 					query.gte(value.substr(2));
 				} else {
 					query.gt(value.substr(1));
 				}
 			} else if('<' == value[0]) {
 				if('=' == value[1]) {
 					query.lte(value.substr(2));
 				} else {
 					query.lt(value.substr(1));
 				}
 			} else {
 				query.equals(value);
 			}
 		}

 		if(queryOptions.current.page) {
 			query.skip(queryOptions.current.page);
 		}
 		if(queryOptions.current.perPage) {
 			query.limit(queryOptions.current.perPage);
 		}
 		if(queryOptions.current.sort) {
 			query.sort(queryOptions.current.sort);
 		}
 		if(queryOptions.current.populate) {
 			var arr = queryOptions.current.populate.split(',');
 			for(var i = 0; i < arr.length; ++i) {
 				query = query.populate(arr[i]);
 			}
 		}
 		if(queryOptions.current.select) { 
 			selectObj = {}; 
 			if(queryOptions.current.select) { 
	 			var arr = queryOptions.current.select.split(','); 
	 			for(var i=0; i < arr.length; ++i) { 
 					selectObj[arr[i]] = 1; 
	 			}
 			}
 			query = query.select(selectObj); 
 		}
 		return query;
 	}

 	function ensureContentType(req, res, next) {
 		var ct = req.get('Content-Type');
 		if(-1 == ct.indexOf('application/json')) {
 			res.send(400, 'Bad request');
 		} else {
 			next();
 		}
 	}
 	function createObject(req, res) {
 		model.create(req.body, function(err, item) {
 			if(err) {
 				res.send(400, 'Bad request');
 			} else {
 				res.type('json');
 				res.send(JSON.stringify(item));
 			}
 		});
 	}
 	function modifyObject(req, res) {
 		delete req.body._id;
 		delete req.body.__v;

 		model.findOneAndUpdate({ _id: res.req.param('id') }, req.body, {}, function(err, item) {
 			if(err) {
 				console.log(err);
 				res.send(404, 'Not found');
 			} else {
 				res.type('json');
 				res.send(JSON.stringify(item));
 			}
 		});
 	}

 	var write_middleware = options.middleware.slice(0);
 	write_middleware.push(ensureContentType);

 	app.get(uri_items, options.middleware, function(req, res) {
 		buildQuery(model.find(), req.query).lean().exec(function(err, items) {
 			if(err) {
 				res.send(400, 'Bad request');
 			} else {
 				res.type('json');
 				if(exclude) { 
 					items = filterjson(items,exclude);
 				}
 				res.send(JSON.stringify(items));
 			}
 		});
 	});
 	app.get(uri_count, options.middleware, function(req, res) { 
 		buildQuery(model.count(), req.query).exec(function(err,count) { 
 			if(err) { 
 				res.send(400, 'Bad request'); 
 			} else { 
 				res.type('json'); 
 				res.send(JSON.stringify({'count':count})); 
 			}
 		}); 
 	});
 	app.post(uri_items, write_middleware, createObject);
 	app.put(uri_items, write_middleware, createObject);
 	app.delete(uri_items, options.middleware, function(req, res) {
 		buildQuery(model.find(), req.query).remove(function(err) {
 			if(err) {
 				res.send(400, 'Bad request');
 			} else {
 				res.send(200, 'Ok');
 			}
 		});
 	});
 	app.get(uri_item, options.middleware, function(req, res) {
 		buildQuery(model.findById(res.req.param('id')), req.query).findOne(function(err, item) {
 			if(err) {
 				res.send(404, 'Not found');
 			} else {
 				res.type('json');
 				res.send(JSON.stringify(item));
 			}
 		});
 	});
 	app.post(uri_item, write_middleware, modifyObject);
 	app.put(uri_item, write_middleware, modifyObject);
 	app.delete(uri_item, options.middleware, function(req, res) {
 		model.remove({ _id: res.req.param('id') }, function(err) {
 			if(err) {
 				res.send(404, 'Not found');
 			} else {
 				res.send(200, 'Ok');
 			}
 		});
 	});
 };

 module.exports.serve = restify;
