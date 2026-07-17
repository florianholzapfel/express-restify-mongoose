# Changelog

### 9.0.13

- **ci:** drop the restify integration tests and the `restify` devDependency. restify (through v11) depends on the abandoned `spdy` → `http-deceiver`, which calls `process.binding('http_parser')` — a binding Node removed in v12 — so it cannot load on any supported Node version and was blocking the release build gate. The Express suite already runs the same integration tests. Restify support code in `src/` is unchanged.
- Note: `9.0.11` and `9.0.12` never reached npm because their release builds failed on the above issue; `9.0.13` is the first published release since `9.0.10` and carries the `9.0.11`/`9.0.12` security fixes below.

### 9.0.12

- **security:** bump `mongoose` to `^8.22.1` (lockfile relocked to 8.24.1), resolving three advisories in the runtime dependency — one critical and two high (prototype-pollution / search-injection fixes landed in 8.8.3, 8.9.5 and 8.22.1). Consumers on the previous `^8.2.1` range already resolved to a patched 8.x on fresh installs; this raises the floor and pins the committed lockfile.
- **ci:** run the publish workflow on Node 24. The release build gate and publish step previously used EOL Node versions, causing the release workflow to fail.

### 9.0.11

- **security:** block server-side JavaScript operators (`$where`, `$function`, `$accumulator`) in the user-supplied `query` parameter and in `populate.match`. Unfiltered query operators allowed an unauthenticated caller to execute JavaScript on the MongoDB server (denial of service via long-running predicates and boolean-based field exfiltration) — NoSQL injection, CWE-943/CWE-94. The check is recursive, so a `$function`/`$accumulator` nested inside `$expr` is rejected as well. [GHSA-5r4m-2pw8-7gvw]
- **security:** `allowRegex` is now enforced structurally against the parsed query object. It could previously be bypassed by sending the query as nested/bracketed parameters (`?query[field][$regex]=…`) instead of a JSON string.
- updated dependencies (rollup 3.30.0, flatted 3.4.2, picomatch 2.3.2)

### 7.0.0

> **This release requires mongoose 6.x**

- updated mongoose to version 6.x

### 6.0.0

> **This release requires mongoose ~5.8**

- updated mongoose to version 5.8

### 5.0.0

- dropped support for Node 4 and added support for Node 10
- removed query operator parsing [#285](https://github.com/florianholzapfel/express-restify-mongoose/issues/285)
- moved request query in req.erm.query [#299](https://github.com/florianholzapfel/express-restify-mongoose/issues/299) [#353](https://github.com/florianholzapfel/express-restify-mongoose/issues/353)
- removed `next` from postProcess [#334](https://github.com/florianholzapfel/express-restify-mongoose/issues/334)
- added error when skip and/or limit is not a valid integer
- removed `_id` tinkering [#326](https://github.com/florianholzapfel/express-restify-mongoose/issues/326)
- removed dependency on `async`

### 4.3.0

- added support for async `outputFn` by returning a Promise

### 4.2.2

- removed dependency on `lodash`, use specific modules and native methods when possible [#352](https://github.com/florianholzapfel/express-restify-mongoose/pull/352)

### 4.2.1

- fixed issue [#294](https://github.com/florianholzapfel/express-restify-mongoose/issues/294)

### 4.2.0

- removed `compile` step, code now runs natively on Node 4+ and `babel` is only used for coverage

### 4.1.1

- fixed `distinct` queries when `options.totalCountHeader` is enabled

### 4.1.0

- improved sync error handling in `buildQuery` by wrapping in a promise
- fixed crash when `distinct` and `sort` operators were used in the same query

### 4.0.0

- improved default error middleware by serializing error objects and removing stack traces
- fixed Mongoose async middleware error propagation
- fixed requests to always set `req.erm.statusCode`
- removed `statusCode` from error object and response body
- removed undocumented `outputFn` parameter, use `req.erm.result` and `req.erm.statusCode`

### 3.2.0

- added an option to disable regex operations ([#195](https://github.com/florianholzapfel/express-restify-mongoose/issues/195))
- fixed queries with an `idProperty` resulting in a `CastError` to return `404` instead of `400` ([#184](https://github.com/florianholzapfel/express-restify-mongoose/issues/184))
- fixed query parser to handle geospatial operators ([#187](https://github.com/florianholzapfel/express-restify-mongoose/issues/187))

### 3.1.0

- critical security fix with the `distinct` operator, see [issue #252](https://github.com/florianholzapfel/express-restify-mongoose/issues/252) for details

### 3.0.0

- ported source to ES2015, compiled and published as ES5 with Babel
- document filtering is now done right before output allowing access to the full document in post middleware
- removed `options.lowercase` and `options.plural`, use `options.name = require('inflection').pluralize('modelName').toLowerCase()`

### 2.0.0

- changed `serve` to no longer returns an Express 4 router, now returns the resource's base path (ie.: `/api/v1/Customer`)
- changed `options.private` and `options.protected` to no longer accept comma separated fields, pass an array instead
- removed `options.excluded`, use `options.private`
- removed support for querying directly with query parameters, use `url?query={"name":"hello"}`
- removed $and and $or query parameters, use `url?query={"$or":[...]}`
- removed `prereq`, use `preMiddleware` instead
- changed `postCreate`, `postUpdate`, and `postDelete` signatures to `(req, res, next)`
- deprecated `outputFn`'s `data` parameter, data now available on `req.erm.result` and `req.erm.statusCode`

### 1.0.0

> **This release requires mongoose ~4**

- updated mongoose to version 4
- removed `fullErrors`, implement a custom `onError` handler instead
- removed `strict` option, allows DELETE without id and POST with id, disallows PUT without id
- async `prereq` and `access` now use the standard `(err, data)` callback signature
- `access` will throw an exception when an unsupported value is passed
- changed `outputFn`'s signature to: `(req, res, { result: result, statusCode: statusCode })`

### 0.7.0

> **This release requires mongoose ~3**
