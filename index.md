---
layout: default
version: 4
---

## Getting started
------------------

**package.json**

```js
{
  "dependencies": {
    "express-restify-mongoose": "^4.0.0",
    "mongoose": "^4.0.0"
  }
}
```

**From the command line**

```js
npm install express-restify-mongoose --save
```

> While the source and examples are now written in ES2015, the module is transpiled and published as ES5 using Babel and remains fully compatible with Node 0.10 and newer.

### Express 4 app

This snippet...

```js
const express = require('express')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const restify = require('express-restify-mongoose')
const app = express()
const router = express.Router()

app.use(bodyParser.json())
app.use(methodOverride())

mongoose.connect('mongodb://localhost:27017/database')

restify.serve(router, mongoose.model('Customer', new mongoose.Schema({
  name: { type: String, required: true },
  comment: { type: String }
})))


app.use(router)

app.listen(3000, () => {
  console.log('Express server listening on port 3000')
})
```

...automatically generates those endpoints.

```
GET http://localhost/api/v1/Customer/count
GET http://localhost/api/v1/Customer
POST http://localhost/api/v1/Customer
DELETE http://localhost/api/v1/Customer

GET http://localhost/api/v1/Customer/:id
GET http://localhost/api/v1/Customer/:id/shallow
PUT http://localhost/api/v1/Customer/:id
POST http://localhost/api/v1/Customer/:id
PATCH http://localhost/api/v1/Customer/:id
DELETE http://localhost/api/v1/Customer/:id
```

### Usage with [request](https://www.npmjs.com/package/request)

```js
const request = require('request')

request.get({
  url: '/api/v1/Model',
  qs: {
    query: JSON.stringify({
      $or: [{
        name: '~Another'
      }, {
        $and: [{
          name: '~Product'
        }, {
          price: '<=10'
        }]
      }],
      price: 20
    })
  }
})
```

## Querying
-----------

All the following parameters (sort, skip, limit, query, populate, select and distinct) support the entire mongoose feature set.

> When passing values as objects or arrays in URLs, they must be valid JSON.

### Sort

```
GET /Customer?sort=name
GET /Customer?sort=-name
GET /Customer?sort={"name":1}
GET /Customer?sort={"name":0}
```

### Skip

```
GET /Customer?skip=10
```

### Limit

Only overrides `options.limit` if the queried limit is lower.

```
GET /Customer?limit=10
```

### Query

Supports all operators ($regex, $gt, $gte, $lt, $lte, $ne, etc.) as well as shorthands: ~, >, >=, <, <=, !=

```
GET /Customer?query={"name":"Bob"}
GET /Customer?query={"name":{"$regex":"^(Bob)"}}
GET /Customer?query={"name":"~^(Bob)"}
GET /Customer?query={"age":{"$gt":12}}
GET /Customer?query={"age":">12"}
GET /Customer?query={"age":{"$gte":12}}
GET /Customer?query={"age":">=12"}
GET /Customer?query={"age":{"$lt":12}}
GET /Customer?query={"age":"<12"}
GET /Customer?query={"age":{"$lte":12}}
GET /Customer?query={"age":"<=12"}
GET /Customer?query={"age":{"$ne":12}}
GET /Customer?query={"age":"!=12"}
```

### Populate

[Population](http://mongoosejs.com/docs/populate.html) is the process of automatically replacing the specified paths in the document with document(s) from other collection(s).

```js
restify.serve(router, mongoose.model('Invoice', new mongoose.Schema({
  customer: [{ type: mongoose.Schema.Types.ObjectId }],
  products: [{ type: mongoose.Schema.Types.ObjectId }]
})))
```

Works with create, read and update operations.

```
GET/POST/PUT /Invoices?populate=customer
GET/POST/PUT /Invoices?populate={"path":"customer"}
GET/POST/PUT /Invoices?populate=[{"path":"customer"},{"path":"products"}]
```

### Select

```
GET /Customer?select=name
GET /Customer?select=-name
GET /Customer?select={"name":1}
GET /Customer?select={"name":0}
```

### Distinct

If the field is private or protected and the request does not have appropriate access, an empty array is returned.

```
GET /Customer?distinct=name
```

## Reference
------------

### serve

```js
const uri = restify.serve(router, model[, options])

// uri = '/api/v1/Model'
```

**router**: `express.Router()` instance (Express 4), `app` object (Express 3) or `server` object (restify)

**model**: mongoose model

**options**: object <span class="label label-primary">type</span><span class="label label-success">default</span><span class="label label-info">version</span>

> When <span class="label label-info">version</span> is unspecified, the feature is available in the initial major release (4.0.0)

- [prefix](#prefix)
- [version](#version)
- [idProperty](#idproperty)
- [restify](#restify)
- [name](#name)
- [allowRegex](#allowregex)
- [runValidators](#runvalidators)
- [readPreference](#readpreference)
- [totalCountHeader](#totalcountheader)
- [private](#private)
- [protected](#protected)
- [lean](#lean)
- [findOneAndUpdate](#findoneandupdate)
- [findOneAndRemove](#findoneandremove)
- [preMiddleware](#premiddleware)
- [preCreate](#precreate)
- [preRead](#preread)
- [preUpdate](#preupdate)
- [preDelete](#predelete)
- [access](#access)
- [contextFilter](#contextfilter)
- [postCreate](#postcreate)
- [postRead](#postread)
- [postUpdate](#postupdate)
- [postDelete](#postdelete)
- [outputFn](#outputfn)
- [postProcess](#postprocess)
- [onError](#onerror)

#### prefix
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">/api</span>

Path to prefix to the REST endpoint.

#### version
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">/v1</span>

API version that will be prefixed to the rest path. If prefix or version contains `/:id`, then that will be used as the location to search for the id.

##### Example

Generates `/api/v1/Entities/:id/Model` and `/api/v1/Entities/Model` for all pertinent methods.

```js
version: '/v1/Entities/:id'
```

#### idProperty
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">_id</span>

`findById` will query on the given property.

#### restify
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">false</span>

Enable support for [restify](https://www.npmjs.com/package/restify) instead of [express](https://www.npmjs.com/package/express).

#### name
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">model name</span>

Endpoint name

#### allowRegex
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether or not regular expressions should be executed. Setting it to `true` will protect against ReDoS, see [issue #195](https://github.com/florianholzapfel/express-restify-mongoose/issues/195) for details.

#### runValidators
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">false</span>

Whether or not mongoose should run schema validators when using `findOneAndUpdate`. For more information, [read the mongoose docs](http://mongoosejs.com/docs/validation.html#update-validators).

#### readPreference
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">primary</span>

Determines the MongoDB nodes from which to read. For more information, [read the mongoose docs](http://mongoosejs.com/docs/api.html#query_Query-read).

#### totalCountHeader
<span class="label label-primary" title="type">boolean|string</span><span class="label label-success" title="default">false</span>

When `totalCountHeader: true`, execute a count query on `GET /Model` requests ignoring limit and skip and setting the result in the a response header. It can also be set to a string to allow for a custom header. This is useful when it's necessary to know in advance how many matching documents exist.

##### Examples

**Boolean**

```js
totalCountHeader: true
```

Response:

```js
Headers: {
  'X-Total-Count': 5
}
```

**String**

```js
totalCountHeader: 'X-Custom-Count-Header'
```

Response:

```js
Headers: {
  'X-Custom-Count-Header': 5
}
```

#### private
<span class="label label-primary" title="type">array</span>

Array of fields which are only to be returned by queries that have `private` access.

##### Example

Defined in options

```js
private: ['topSecret', 'fields']
```

Defined in mongoose schema

```js
new Schema({
  topSecret: { type: String, access: 'protected' },
  fields: { type: String, access: 'protected' }
})
```

#### protected
<span class="label label-primary" title="type">array</span>

Array of fields which are only to be returned by queries that have `private` or `protected` access.

##### Examples

Defined in options

```js
protected: ['somewhatSecret', 'keys']
```

Defined in mongoose schema

```js
new Schema({
  somewhatSecret: { type: String, access: 'protected' },
  keys: { type: String, access: 'protected' }
})
```

#### lean
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether or not mongoose should use `.lean()` to convert results to plain old JavaScript objects. This is bad for performance, but allows returning virtuals, getters and setters.

#### findOneAndUpdate
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether to use `.findOneAndUpdate()` or `.findById()` and then `.save()`, allowing document middleware to be called. For more information regarding mongoose middleware, [read the docs](http://mongoosejs.com/docs/middleware.html).

#### findOneAndRemove
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether to use `.findOneAndRemove()` or `.findById()` and then `.remove()`, allowing document middleware to be called. For more information regarding mongoose middleware, [read the docs](http://mongoosejs.com/docs/middleware.html).

#### preMiddleware
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs before [preCreate](#preCreate), [preRead](#preRead), [preUpdate](#preUpdate) and [preDelete](#preDelete).

##### Example

```js
preMiddleware: (req, res, next) => {
  performAsyncLogic((err) => {
    next(err)
  })
}
```

#### preCreate
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs before creating a resource.

```js
preCreate: (req, res, next) => {
  performAsyncLogic((err) => {
    next(err)
  })
}
```

#### preRead
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs before reading a resource.

```js
preRead: (req, res, next) => {
  performAsyncLogic((err) => {
    next(err)
  })
}
```

#### preUpdate
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs before updating a resource.

```js
preUpdate: (req, res, next) => {
  performAsyncLogic((err) => {
    next(err)
  })
}
```

When `findOneAndUpdate: false`, the document is available which is useful for authorization as well as setting values.

```js
findOneAndUpdate: false,
preUpdate: (req, res, next) => {
  if (req.erm.document.user !== req.user._id) {
    return res.sendStatus(401)
  }

  req.erm.document.set('lastRequestAt', new Date())

  next()
}
```

#### preDelete
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs before deleting a resource.

```js
preDelete: (req, res, next) => {
  performAsyncLogic((err) => {
    next(err)
  })
}
```

When `findOneAndRemove: false`, the document is available which is useful for authorization as well as performing non-destructive removals.

```js
findOneAndRemove: false,
preDelete: (req, res, next) => {
  if (req.erm.document.user !== req.user._id) {
    return res.sendStatus(401)
  }

  req.erm.document.deletedAt = new Date()
  req.erm.document.save().then((doc) => {
    res.sendStatus(204)
  }).catch((err) => {
    options.onError(err, req, res, next)
  })
}
```

#### access
<span class="label label-primary" title="type">(req[, done]) => {}</span>

Returns or yields 'private', 'protected' or 'public'. It is called on GET, POST and PUT requests and filters out the fields defined in [private](#private) and [protected](#protected).

##### Examples

Sync

```js
access: (req) => {
  if (req.isAuthenticated()) {
    return req.user.isAdmin ? 'private' : 'protected'
  } else {
    return 'public'
  }
}
```

Async

```js
access: (req, done) => {
  performAsyncLogic((err, result) => {
    done(err, result ? 'public' : 'private')
  })
}
```

#### contextFilter
<span class="label label-primary" title="type">(model, req, done) => {}</span>

Allows request specific filtering.

##### Example

```js
contextFilter: (model, req, done) => {
  done(model.find({
    user: req.user._id
  }))
}
```

#### postCreate
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs after successfully creating a resource. The unfiltered document is available on `req.erm.result`.

```js
postCreate: (req, res, next) => {
  const result = req.erm.result         // unfiltered document or object
  const statusCode = req.erm.statusCode // 201

  performAsyncLogic((err) => {
    next(err)
  })
}
```

#### postRead
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs after successfully reading a resource. The unfiltered document(s), or object(s) when `lean: false`, is available on `req.erm.result`.

```js
postRead: (req, res, next) => {
  const result = req.erm.result         // unfiltered document, object or array
  const statusCode = req.erm.statusCode // 200

  performAsyncLogic((err) => {
    next(err)
  })
}
```

#### postUpdate
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs after successfully updating a resource. The unfiltered document, or object when `lean: false`, is available on `req.erm.result`.

```js
postUpdate: (req, res, next) => {
  const result = req.erm.result         // unfiltered document or object
  const statusCode = req.erm.statusCode // 200

  performAsyncLogic((err) => {
    next(err)
  })
}
```

#### postDelete
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that runs after successfully deleting a resource.

```js
postDelete: (req, res, next) => {
  const result = req.erm.result         // undefined
  const statusCode = req.erm.statusCode // 204

  performAsyncLogic((err) => {
    next(err)
  })
}
```

#### outputFn
<span class="label label-primary" title="type">(req, res) => {}</span><span class="label label-info">4.3 (Promise support)</span>

Function used to output the result. The filtered object is available on `req.erm.result`. Using the async version allows handling errors through [onError](#onerror).

##### Examples

Sync

```js
outputFn: (req, res) => {
  const result = req.erm.result         // filtered object
  const statusCode = req.erm.statusCode // 200 or 201

  res.status(statusCode).json(result)
}
```

Async (using promises)

```js
outputFn: (req, res) => {
  return performAsyncLogic().then() => {
    const result = req.erm.result         // filtered object
    const statusCode = req.erm.statusCode // 200 or 201

    return res.status(statusCode).json(result)
  })
}
```

Async (using async/await)

```js
outputFn: async (req, res) => {
  const asyncLogicResult = await performAsyncLogic()

  const result = req.erm.result         // filtered object
  const statusCode = req.erm.statusCode // 200 or 201

  return res.status(statusCode).json(result)
}
```

#### postProcess
<span class="label label-primary" title="type">(req, res, next) => {}</span>

Middleware that is called after output, useful for logging. The filtered object is available on `req.erm.result`.

> Not guaranteed to execute after output if async operations are performed inside `outputFn`

```js
postProcess: (req, res, next) => {
  const result = req.erm.result         // filtered object
  const statusCode = req.erm.statusCode // 200 or 201

  console.info(`${req.method} ${req.path} request completed with status code ${statusCode}`)
}
```

#### onError
<span class="label label-primary" title="type">(err, req, res, next) => {}</span><span class="label label-success" title="default">serialize the entire error, except stack</span>

> Leaving this as default may leak information about your database

Function used to output an error.

##### Example

```js
onError: (err, req, res, next) => {
  const statusCode = req.erm.statusCode // 400 or 404

  res.status(statusCode).json({
    message: err.message
  })
}
```

### defaults

```js
restify.defaults(options)
```

**options**: same as above, sets this object as the defaults for anything served afterwards
