Changelog
=========

### 1.0.0

> **This release is no longer compatible with mongoose 3**

* updated mongoose to version 4
* removed `fullErrors`, implement a custom `onError` handler instead
* removed `strict` option, allows DELETE without id and POST with id, disallows PUT without id
* async `prereq` and `access` now use the standard `(err, data)` callback signature
* `access` will throw an exception when an unsupported value is passed
* changed `outputFn`'s signature to: `(req, res, { result: result, statusCode: statusCode })`
