Changelog
=========

### 2.0.0

* `options.private` and `options.protected` no longer accept comma separated fields, pass an array instead
* removed `options.excluded`, use `options.private`
* removed support for querying with parameters, use `url?query={"name":"hello"}`
* removed $and and $or passed as parameters, use `url?query={"$or":[...]}`
* removed `prereq`, use `preMiddleware` as a drop in replacement
* removed `postCreate`, `postUpdate`, and `postDelete`, use `postMiddleware`
* removed `postProcess`, use `postMiddleware` or hook into `outputFn`
* `serve` no longer returns an Express 4 router, now returns the resource's base path (ie.: `/api/v1/Customer`) 

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
