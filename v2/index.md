---
layout: default
version: 2
---

## Getting started
------------------

**package.json**

```js
{
  "dependencies": {
    "express-restify-mongoose": "^2.0.0",
    "mongoose": "^4.0.0"
  }
}
```

**From the command line**

```js
npm install express-restify-mongoose --save
```

### Express 4 app

This snippet...

```js
var express = require('express')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var mongoose = require('mongoose')
var restify = require('express-restify-mongoose')
var app = express()
var router = express.Router()

app.use(bodyParser.json())
app.use(methodOverride())

mongoose.connect('mongodb://localhost/database')

restify.serve(router, mongoose.model('Customer', new mongoose.Schema({
  name: { type: String, required: true },
  comment: { type: String }
})))

app.use(router)

app.listen(3000, function () {
  console.log('Express server listening on port 3000')
})
```

...automatically generates those endpoints.

```
GET http://localhost/api/v1/Customers/count
GET http://localhost/api/v1/Customers
PUT http://localhost/api/v1/Customers
POST http://localhost/api/v1/Customers
DELETE http://localhost/api/v1/Customers

GET http://localhost/api/v1/Customers/:id
GET http://localhost/api/v1/Customers/:id/shallow
PUT http://localhost/api/v1/Customers/:id
POST http://localhost/api/v1/Customers/:id
DELETE http://localhost/api/v1/Customers/:id
```

### Usage with [request](https://www.npmjs.com/package/request)

```js
var request = require('request')

request({
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

> When passing values as objects or arrays in URLs, they must be valid JSON

### Sort

```
GET /Customers?sort=name
GET /Customers?sort=-name
GET /Customers?sort={"name":1}
GET /Customers?sort={"name":-1}
```

### Skip

```
GET /Customers?skip=10
```

### Limit

Only overrides `options.limit` if the queried limit is lower

```
GET /Customers?limit=10
```

### Query

Supports all operators ($regex, $gt, $gte, $lt, $lte, $ne, etc.) as well as shorthands: ~, >, >=, <, <=, !=

```
GET /Customers?query={"name":"Bob"}
GET /Customers?query={"name":{"$regex":"^(Bob)"}}
GET /Customers?query={"name":"~^(Bob)"}
GET /Customers?query={"age":{"$gt":12}}
GET /Customers?query={"age":">12"}
GET /Customers?query={"age":{"$gte":12}}
GET /Customers?query={"age":">=12"}
GET /Customers?query={"age":{"$lt":12}}
GET /Customers?query={"age":"<12"}
GET /Customers?query={"age":{"$lte":12}}
GET /Customers?query={"age":"<=12"}
GET /Customers?query={"age":{"$ne":12}}
GET /Customers?query={"age":"!=12"}
```

### Populate

Works with create, read and update operations

```
GET/POST/PUT /Invoices?populate=customer
GET/POST/PUT /Invoices?populate={"path":"customer"}
GET/POST/PUT /Invoices?populate=[{"path":"customer"},{"path":"products"}]
```

### Select

`_id` is always returned unless explicitely excluded

```
GET /Customers?select=name
GET /Customers?select=-name
GET /Customers?select={"name":1}
GET /Customers?select={"name":0}
```

### Distinct

```
GET /Customers?distinct=name
```

## Reference
------------

### serve

```js
restify.serve(router, model[, options])
```

**router**: express.Router() instance (Express 4), app object (Express 3) or server object (restify)

**model**: mongoose model

**options**: object <span class="label label-primary">type</span><span class="label label-success">default</span><span class="label label-info">version</span>

#### prefix
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">/api</span>

Path to prefix to the REST endpoint

#### version
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">/v1</span>

API version that will be prefixed to the rest path. If prefix or version contains `/:id`, then that will be used as the location to search for the id

##### Example

Generates `/api/v1/Entities/:id/Model` and `/api/v1/Entities/Model` for all pertinent methods

```js
version: '/v1/Entities/:id'
```

#### idProperty
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">_id</span>

`findById` will query on the given property

#### restify
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">false</span>

Enable support for [restify](https://www.npmjs.com/package/restify) instead of [express](https://www.npmjs.com/package/express)

#### plural
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Automatically pluralize model names using [inflection](https://www.npmjs.com/package/inflection)

#### lowercase
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">false</span>

Whether to call `.toLowerCase()` on model names before generating the routes

#### name
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">model name</span>

Endpoint name

#### readPreference
<span class="label label-primary" title="type">string</span><span class="label label-success" title="default">primary</span><span class="label label-info">2.3</span>

Determines the MongoDB nodes from which to read. [Read more](http://mongoosejs.com/docs/api.html#query_Query-read)

#### totalCountHeader
<span class="label label-primary" title="type">boolean|string</span><span class="label label-success" title="default">false</span><span class="label label-info">2.4</span>

When set to `true`, executes a count query on `GET /Model` requests that sets limit and skip to 0 and sets the result in the
`X-Total-Count` header. It can also be set to a string to allow for a custom header.

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

Array of fields which are only to be returned by queries that have private access

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

Array of fields which are only to be returned by queries that have private or protected access

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

Whether to use findOneAndUpdate or first findById and then save, allowing document middleware to be called. For more information regarding mongoose middleware, [read the docs](http://mongoosejs.com/docs/middleware.html).

#### findOneAndRemove
<span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether to use findOneAndRemove or first findById and then remove, allowing document middleware to be called. For more information regarding mongoose middleware, [read the docs](http://mongoosejs.com/docs/middleware.html).

#### preMiddleware
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs before [preCreate](#preCreate), [preRead](#preRead), [preUpdate](#preUpdate) and [preDelete](#preDelete). 

##### Example

```js
preMiddleware: function (req, res, next) {
  performAsyncLogic(function (err) {
    next(err)
  })
}
```

#### preCreate
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.1</span>

Middleware that runs before creating a resource

```js
preCreate: function (req, res, next) {
  performAsyncLogic(function (err) {
    next(err)
  })
}
```

#### preRead
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.1</span>

Middleware that runs before reading a resource

```js
preRead: function (req, res, next) {
  performAsyncLogic(function (err) {
    next(err)
  })
}
```

#### preUpdate
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.1</span>

Middleware that runs before updating a resource

```js
preUpdate: function (req, res, next) {
  performAsyncLogic(function (err) {
    next(err)
  })
}
```

<span class="label label-info">new in 2.2</span>

When `findOneAndUpdate` is disabled, the document is made available which is useful for authorization as well as setting values

```js
findOneAndUpdate: false,
preUpdate: function (req, res, next) {
  if (req.erm.document.user !== req.user._id) {
    return res.sendStatus(401)
  }

  req.erm.document.set('lastRequestAt', new Date())

  next()
}
```

#### preDelete
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.1</span>

Middleware that runs before deleting a resource

```js
preDelete: function (req, res, next) {
  performAsyncLogic(function (err) {
    next(err)
  })
}
```

<span class="label label-info">new in 2.2</span>

When `findOneAndRemove` is disabled, the document is made available which is useful for authorization as well as performing non-destructive removals

```js
findOneAndRemove: false,
preDelete: function (req, res, next) {
  if (req.erm.document.user !== req.user._id) {
    return res.sendStatus(401)
  }

  req.erm.document.deletedAt = new Date()
  req.erm.document.save().then(function (doc) {
    res.sendStatus(204)
  }, function (err) {
    options.onError(err, req, res, next)
  })
}
```

#### access
<span class="label label-primary" title="type">function (req[, done])</span>

Returns or yields 'private', 'protected' or 'public'. It is called on GET, POST and PUT requests and filters out the fields defined in [private](#private) and [protected](#protected)

##### Examples

Sync

```js
access: function (req) {
  if (req.isAuthenticated()) {
    return req.user.isAdmin ? 'private' : 'protected'
  } else {
    return 'public'
  }
}
```

Async

```js
access: function (req, done) {
  performAsyncLogic(function (err, result) {
    done(err, result ? 'public' : 'private')
  })
}
```

#### contextFilter
<span class="label label-primary" title="type">function (model, req, done)</span>

Allows request specific filtering

##### Example

```js
contextFilter: function (model, req, done) {
  done(model.find({
    user: req.user._id
  }))
}
```

#### postCreate
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully creating a resource

```js
postCreate: function (req, res, next) {
  var result = req.erm.result         // object
  var statusCode = req.erm.statusCode // 201

  performAsyncLogic(function (err) {
    next(err)
  })
}
```

#### postRead
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully reading a resource

```js
postRead: function (req, res, next) {
  var result = req.erm.result         // object / array
  var statusCode = req.erm.statusCode // 200

  performAsyncLogic(function (err) {
    next(err)
  })
}
```

#### postUpdate
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully updating a resource

```js
postUpdate: function (req, res, next) {
  var result = req.erm.result         // object
  var statusCode = req.erm.statusCode // 200

  performAsyncLogic(function (err) {
    next(err)
  })
}
```

#### postDelete
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully deleting a resource

```js
postDelete: function (req, res, next) {
  var result = req.erm.result         // undefined
  var statusCode = req.erm.statusCode // 204

  performAsyncLogic(function (err) {
    next(err)
  })
}
```

#### outputFn
<span class="label label-primary" title="type">function (req, res)</span>

Function used to output the result

##### Example

```js
outputFn: function (req, res) {
  res.status(req.erm.statusCode).json(req.erm.result)
}
```

#### postProcess
<span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that is called after output, useful for logging

<div class="alert alert-warning">
  <i class="glyphicon glyphicon-alert"></i> Not guaranteed to execute after output if async operations are performed inside `outputFn`
</div>

```js
postProcess: function (req, res, next) {
  console.log(`${req.method} ${req.path} request completed with response code ${req.erm.statusCode}`)
}
```

#### onError
<span class="label label-primary" title="type">function (err, req, res, next)</span><span class="label label-success" title="default">send the entire mongoose error</span>

<div class="alert alert-warning">
  <i class="glyphicon glyphicon-alert"></i> Leaving this as default may leak information about your database
</div>

Function used to output an error

##### Example

```js
onError: function (err, req, res, next) {
  next(err)
}
```

### defaults

```js
restify.defaults(options)
```

**options**: same as above, sets this object as the defaults for anything served afterwards
