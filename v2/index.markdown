---
layout: default
---

## Getting started
------------------

{% highlight javascript %}
npm install express-restify-mongoose --save
{% endhighlight %}

### Upgrading from v1

* changed `serve` to no longer returns an Express 4 router, now returns the resource's base path (ie.: `/api/v1/Customer`)
* changed `options.private` and `options.protected` to no longer accept comma separated fields, pass an array instead
* removed `options.excluded`, use `options.private`
* removed support for querying directly with query parameters, use `url?query={"name":"hello"}`
* removed $and and $or query parameters, use `url?query={"$or":[...]}`
* removed `prereq`, use `preMiddleware` instead
* changed `postCreate`, `postUpdate`, and `postDelete` signatures to `(req, res, next)`
* deprecated `outputFn`'s `data` parameter, data now available on `req.erm.result` and `req.erm.statusCode`

### Express 4 app

<div class="row">
  <div class="col-md-6">
    <p>This snippet...</p>
{% highlight javascript %}
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
{% endhighlight %}
  </div>
  <div class="col-md-6">
    <p>...automatically generates those endpoints.</p>
{% highlight apache %}
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
{% endhighlight %}
  </div>
</div>

### Usage with [request](https://www.npmjs.com/package/request)

{% highlight javascript %}
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
{% endhighlight %}

## Query
--------

### Sort, skip and limit

{% highlight apache %}
GET http://localhost/api/v1/Customers?sort=name
GET http://localhost/api/v1/Customers?sort=-name
GET http://localhost/api/v1/Customers?skip=10&amp;limit=10
{% endhighlight %}

### Populate

Populated fields will not have any effect on select fields as supported by Mongoose, they will be fetched along with select fields.

{% highlight apache %}
GET http://localhost/api/v1/Invoices?populate=customer
GET http://localhost/api/v1/Invoices?populate=customer&amp;select=amount
GET http://localhost/api/v1/Invoices?populate=customer&amp;select=customer.name
GET http://localhost/api/v1/Invoices?populate=customer&amp;select=customer,amount
GET http://localhost/api/v1/Invoices?populate=customer&amp;select=customer.name,amount
{% endhighlight %}

## Reference
------------

### serve

{% highlight javascript %}
restify.serve(router, model[, options])
{% endhighlight %}

**router**: express.Router() instance (Express 4), app object (Express 3) or server object (restify)

**model**: mongoose model

**options**: object <span class="label label-primary">type</span><span class="label label-success">default</span><span class="label label-info">version</span>

#### prefix <span class="label label-primary" title="type">string</span><span class="label label-success" title="default">/api</span>

Path to prefix to the REST endpoint.

#### version <span class="label label-primary" title="type">string</span><span class="label label-success" title="default">/v1</span>

API version that will be prefixed to the rest path. If prefix or version contains <code>/:id</code>, then that will be used as the location to search for the id.

##### Example

Generate <code>/api/v1/Entities/:id/Model</code> and <code>/api/v1/Entities/Model</code> for all pertinent methods:

{% highlight javascript %}
version: '/v1/Entities/:id'
{% endhighlight %}

#### idProperty <span class="label label-primary" title="type">string</span><span class="label label-success" title="default">_id</span>

findById will query on the given property.

#### preMiddleware <span class="label label-primary" title="type">function | array</span>

An Express middleware or an array of Express middlewares that will be called after <a>prereq</a> and before <a>access</a>.

##### Example

{% highlight javascript %}
preMiddleware: function (req, res, next) {
  console.log('Incoming %s request', req.method)
}
{% endhighlight %}

#### access <span class="label label-primary" title="type">function</span>

Returns or yields 'private', 'protected' or 'public'. It is called on GET, POST and PUT requests and filters out the fields defined in <a>private</a> and <a>protected</a>.

##### Examples

Sync

{% highlight javascript %}
access: function (req) {
  if (req.isAuthenticated()) {
    return req.user.isAdmin ? 'private' : 'protected'
  } else {
    return 'public'
  }
}
{% endhighlight %}

Async

{% highlight javascript %}
access: function (req, cb) {
  performAsyncLogic(function (err, result) {
    cb(err, result ? 'public' : 'private')
  })
}
{% endhighlight %}

#### restify <span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">false</span>

Enable support for restify instead of Express.

#### plural <span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">false</span>

Automatically pluralize the model's name using [inflection](https://www.npmjs.com/package/inflection).

#### lowercase <span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">false</span>

Whether to call <code>.toLowerCase()</code> on the model's name before generating the routes.

#### name <span class="label label-primary" title="type">string</span><span class="label label-success" title="default">the model's name</span>

The endpoint's name.

#### onError <span class="label label-primary" title="type">function (err, req, res, next)</span><span class="label label-success" title="default">send the entire mongoose error</span>

<div class="alert alert-warning">
  <i class="glyphicon glyphicon-alert"></i> Leaving this as default may leak information about your database.
</div>

Function used to output an error.

##### Example

{% highlight javascript %}
onError: function (err, req, res, next) {
  next(err)
}
{% endhighlight %}

#### outputFn <span class="label label-primary" title="type">function (req, res)</span>

Function used to output the result.

##### Example

{% highlight javascript %}
outputFn: function (req, res) {
  res.status(req.erm.statusCode).json(req.erm.result)
}
{% endhighlight %}

#### private <span class="label label-primary" title="type">array</span>

Array of fields which are only to be returned by queries that have private access.

##### Example

{% highlight javascript %}
private: ['topSecret', 'fields']
{% endhighlight %}

#### protected <span class="label label-primary" title="type">array</span>

Array of fields which are only to be returned by queries that have private or protected access.

##### Example

{% highlight javascript %}
protected: ['somewhatSecret', 'keys']
{% endhighlight %}

#### lean <span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether or not mongoose should use <code>.lean()</code> to convert results to plain old JavaScript objects. This is bad for performance, but allows returning virtuals, getters and setters.

#### findOneAndUpdate <span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether to use findOneAndUpdate or first findById and then save, allowing document middleware to be called. For more information regarding mongoose middleware, [read the docs](http://mongoosejs.com/docs/middleware.html).

#### findOneAndRemove <span class="label label-primary" title="type">boolean</span><span class="label label-success" title="default">true</span>

Whether to use findOneAndRemove or first findById and then remove, allowing document middleware to be called. For more information regarding mongoose middleware, [read the docs](http://mongoosejs.com/docs/middleware.html).

#### contextFilter <span class="label label-primary" title="type">function (model, req, cb)</span>

Allows request specific filtering

##### Example

{% highlight javascript %}
contextFilter: function (model, req, cb) {
  cb(model.find({
    user: req.user._id
  }))
}
{% endhighlight %}

#### postCreate <span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully creating a resource

{% highlight javascript %}
postCreate: function (req, res, next) {
  var result = req.erm.result         // object
  var statusCode = req.erm.statusCode // 201

  performAsyncLogic(function (err) {
    next(err)
  }
}
{% endhighlight %}

#### postRead <span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully reading a resource

{% highlight javascript %}
postRead: function (req, res, next) {
  var result = req.erm.result         // object / array
  var statusCode = req.erm.statusCode // 200

  performAsyncLogic(function (err) {
    next(err)
  }
}
{% endhighlight %}

#### postUpdate <span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully updating a resource

{% highlight javascript %}
postUpdate: function (req, res, next) {
  var result = req.erm.result         // object
  var statusCode = req.erm.statusCode // 200

  performAsyncLogic(function (err) {
    next(err)
  }
}
{% endhighlight %}

#### postDelete <span class="label label-primary" title="type">function (req, res, next)</span><span class="label label-info">2.0</span>

Middleware that runs after successfully deleting a resource

{% highlight javascript %}
postDelete: function (req, res, next) {
  var result = req.erm.result         // undefined
  var statusCode = req.erm.statusCode // 204

  performAsyncLogic(function (err) {
    next(err)
  }
}
{% endhighlight %}

### defaults

{% highlight javascript %}
restify.defaults(options)
{% endhighlight %}

**options**: same as above, sets this object as the defaults for anything served afterwards
