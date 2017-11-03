Changelog
=========

### 4.3.0

* added support for async `outputFn` by returning a Promise

### 4.2.2

* removed dependency on lodash, use specific modules and native methods when possible [#352](https://github.com/florianholzapfel/express-restify-mongoose/pull/352)

### 4.2.1

* fixed issue [#294](https://github.com/florianholzapfel/express-restify-mongoose/issues/294)

### 4.2.0

* removed `compile` step, code now runs natively on Node 4+ and `babel` is only used for coverage

### 4.1.1

* fixed `distinct` queries when `options.totalCountHeader` is enabled

### 4.1.0

* improved sync error handling in `buildQuery` by wrapping in a promise
* fixed crash when `distinct` and `sort` operators were used in the same query

### 4.0.0

* improved default error middleware by serializing error objects and removing stack traces
* fixed Mongoose async middleware error propagation
* fixed requests to always set `req.erm.statusCode`
* removed `statusCode` from error object and response body
* removed undocumented `outputFn` parameter, use `req.erm.result` and `req.erm.statusCode`

### 3.2.0

* added an option to disable regex operations  ([#195](https://github.com/florianholzapfel/express-restify-mongoose/issues/195))
* fixed queries with an `idProperty` resulting in a `CastError` to return `404` instead of `400`  ([#184](https://github.com/florianholzapfel/express-restify-mongoose/issues/184))
* fixed query parser to handle geospatial operators ([#187](https://github.com/florianholzapfel/express-restify-mongoose/issues/187))

### 3.1.0

* critical security fix with the `distinct` operator, see [issue #252](https://github.com/florianholzapfel/express-restify-mongoose/issues/252) for details

### 3.0.0

* ported source to ES2015, compiled and published as ES5 with Babel
* document filtering is now done right before output allowing access to the full document in post middleware
* removed `options.lowercase` and `options.plural`, use `options.name = require('inflection').pluralize('modelName').toLowerCase()`

### 2.0.0

* changed `serve` to no longer returns an Express 4 router, now returns the resource's base path (ie.: `/api/v1/Customer`)
* changed `options.private` and `options.protected` to no longer accept comma separated fields, pass an array instead
* removed `options.excluded`, use `options.private`
* removed support for querying directly with query parameters, use `url?query={"name":"hello"}`
* removed $and and $or query parameters, use `url?query={"$or":[...]}`
* removed `prereq`, use `preMiddleware` instead
* changed `postCreate`, `postUpdate`, and `postDelete` signatures to `(req, res, next)`
* deprecated `outputFn`'s `data` parameter, data now available on `req.erm.result` and `req.erm.statusCode`

### 1.0.0

> **This release requires mongoose ~4**

* updated mongoose to version 4
* removed `fullErrors`, implement a custom `onError` handler instead
* removed `strict` option, allows DELETE without id and POST with id, disallows PUT without id
* async `prereq` and `access` now use the standard `(err, data)` callback signature
* `access` will throw an exception when an unsupported value is passed
* changed `outputFn`'s signature to: `(req, res, { result: result, statusCode: statusCode })`

### 0.7.0

> **This release requires mongoose ~3**
