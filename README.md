# express-restify-mongoose
This library provides mongoose database models with a REST interface.

[![Build Status](https://travis-ci.org/florianholzapfel/express-restify-mongoose.png)](https://travis-ci.org/florianholzapfel/express-restify-mongoose)
[![NPM version](https://badge.fury.io/js/express-restify-mongoose.png)](http://badge.fury.io/js/express-restify-mongoose)
[![Dependencies](https://david-dm.org/florianholzapfel/express-restify-mongoose.png)](https://david-dm.org/florianholzapfel/express-restify-mongoose)

## Getting started

In your shell, install with npm:

```sh
npm install express-restify-mongoose
```

In your code:

**Express 3**

```javascript
var http = require('http');
var express = require('express');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var restify = require('express-restify-mongoose')

mongoose.connect('mongodb://localhost/database');

var Customer = new Schema({
	name: { type: String, required: true },
	comment: { type: String }
});
var CustomerModel = mongoose.model('Customer', Customer);

var Invoice = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
	amount: { type: Number, required: true }
});
var InvoiceModel = mongoose.model('Invoice', Invoice);

var app = express();
app.configure(function(){
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	restify.serve(app, CustomerModel);
	restify.serve(app, InvoiceModel);
});

http.createServer(app).listen(3000, function() {
	console.log("Express server listening on port 3000");
});
```

**Express 4**

```javascript
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var restify = require('express-restify-mongoose')

mongoose.connect('mongodb://localhost/database');

var Customer = new Schema({
	name: { type: String, required: true },
	comment: { type: String }
});
var CustomerModel = mongoose.model('Customer', Customer);

var Invoice = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
	amount: { type: Number, required: true }
});
var InvoiceModel = mongoose.model('Invoice', Invoice);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());

var router = express.Router();
restify.serve(router, CustomerModel);
restify.serve(router, InvoiceModel);
app.use(router);

app.listen(3000, function() {
    console.log("Express server listening on port 3000");
});
```

Then you can excute the following queries:

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

### Query
```
GET http://localhost/api/v1/Customers?name=~regex
GET http://localhost/api/v1/Customers?name=value
GET http://localhost/api/v1/Customers?name=>value
GET http://localhost/api/v1/Customers?name=>=value
GET http://localhost/api/v1/Customers?name=<value
GET http://localhost/api/v1/Customers?name=<=value
GET http://localhost/api/v1/Customers?name=!=value
GET http://localhost/api/v1/Customers?select=name
GET http://localhost/api/v1/Customers?select=-name
```
## Mongoose Query
```
var query = { $or: [
                {name: '~Another'},
                {$and: [
                    {name: '~Product'},
                    {price: '<=10'}
                ]}
            ],
                price: 20
            };
request({
    url: 'api/v1/Model',
    qs: { query: encodeURIComponent(JSON.stringify(query) }
})
GET http://localhost/api/v1/Customers?query={"field":">=value", "field":[value1,value2]
                                                 "$and":[{"field":"~value"},{"field":"!=value"}]}
```
## Logical Queries (and,or)
```
GET http://localhost/api/v1/Customers?$and=[{"field":">=value"},{"field":[value1,value2]}]
GET http://localhost/api/v1/Customers?$or=[{"field":"value"},{"$and",[{"field":"~value"},{"field":"!=value"}]}]
```

### Ordering & Sorting
```
GET http://localhost/api/v1/Customers?sort=name
GET http://localhost/api/v1/Customers?sort=-name
GET http://localhost/api/v1/Customers?skip=10&limit=10
```

### Populate Fields
```
GET http://localhost/api/v1/Invoices?populate=customer
GET http://localhost/api/v1/Invoices?populate=customer&select=customer.name

## populate fields will not have effect on select fields as supported by Mongoose
# populate fields will be fetched along with select fields
GET http://localhost/api/v1/Invoices?populate=customer
GET http://localhost/api/v1/Invoices?populate=customer&select=amount
GET http://localhost/api/v1/Invoices?populate=customer&select=customer,amount
GET http://localhost/api/v1/Invoices?populate=customer&select=customer.name,amount

```

## Reference
### serve
```
serve(app, model, [options])
```

#### arguments
* **app** - The express app
* **model** - Your mongoose database model
* **options** - Optional options object
  * **strict** - When set to true, disallows DELETE all, POST with id param, and PUT without id param
  * **prefix** - Some path that will be prefixed to the REST path. Defaults to `/api`
  * **version** - An API version that will be prefixed to the rest path. Defaults to `/v1`
    * if either api or version contain `/:id` then that will be used as the location to search for the id. `version: 'v1/Entities/:id'` will generate `/api/v1/Entities/:id/<modelName>` and `/api/v1/Entities/<modelName>` for all pertinent methods
  * **idProperty** - If specified, the 'by id' methods will query on the given property instead of _id
  * **middleware** - An express middleware or an array of express middlewares that will be used.
  * **prereq** - A function that takes the req object and returns or yields true or false. This function will be called for every POST PUT and DELETE request and send 403 on false.
  * **access** - A function that takes the req object and returns or yields 'public', 'private', or 'protected'. This function will be called for every GET POST and PUT request and filter out the appropriate fields
  * **plural** - If `true`, does not pluralize the database model name. Default is `false`
  * **lowercase** - If `true`, turn model name to lower case before generating the routes.
  * **name** - If specified, this is used as the name of the endpoint
  * **onError** - A function with the signature `function(err, req, res, next)` that is used to output an error. `err` is the error object that is returned by mongoose. Works best with `fullErrors = true`
  * **outputFn** - A function with the signature `function(res, result)` that is used to output the result. `res` is a restify or express result object, `result` is the result that is returned from the mongo db.
  * **private** - String of comma separated field names which are not to be returned by queries that do not have private access.
  * **protected** - String of comma separated field names which are not to be returned by queries that have public access.
  * **postProcess** - A middleware to be called after the response has been sent. It is only executed on success.  If an error is sent to the client, this is not executed.
  * **lean** - If `false`, will not convert to returned values to plain old javascript objects. This is bad for performance, but it allows for returning virtuals, getters    and setters.
  * **findOneAndUpdate** - If `false`, will first find documents by id and then call save. This
    allows mongoose validators to be called. Default is `true`.
    (For more information, read the Mongoose docs:
    http://mongoosejs.com/docs/api.html#model_Model.findByIdAndUpdate)
  * **findOneAndRemove** - If `false`, will first find documents by id and then call remove. This
    allows mongoose post and pre hooks to be called. Default is `true`.
    (For more information, read the Mongoose docs:
    http://mongoosejs.com/docs/api.html#model_Model.findOneAndRemove)
  * **contextFilter** - `function(model, req, cb)`. Allows authorization per request, for example filtering items based on req.user. Defaults to `cb(model)`.
 * **postCreate** - A function with the signature `function (res, result, done)` which is run after document creation.
 * **postDelete** - A function with the signature `function (res, result, done)` which is run after document deletion.
 * **fullErrors** - When an occurs in mongoose, the full error object, if available, will be returned instead of just the HTTP status message.  Default false

### defaults
```
defaults(options)
```

#### arguments
* options - Same options as above. This function will set this object as the defaults for anything you declare afterwards.

## Examples
### Basic access control

```javascript
restify.serve(app, MyModel, {
  prereq: function(req) {
    if (req.method === 'DELETE') {
      return false;
    } else if (req.user) {
      return true;
    } else {
      return false;
    }
  },
  contextFilter: function(model, req, cb) {
    if (req.user) {
      cb(model);
    } else {
      cb(model.find({
        isPublic: true
      }));
    }
  }
});
```

## Contributors
* Enric León (https://github.com/nothingbuttumbleweed)
* David Higginbotham (https://github.com/dhigginbotham)
* Jonathan Greenemeier (https://github.com/6eDesign)
* Alan Levicki (https://github.com/alevicki)
* Michael (https://github.com/micheee)
* Matt Roman (https://github.com/romanmt)
* Fetrarijaona R. (https://github.com/fetrarij)
* Jan Paul Erkelens (https://github.com/jperkelens)
* Christoph Herbst (https://github.com/cherbst)
* doobinay (https://github.com/doobinay)
* Hareesh (https://github.com/hareeshbabu82ns)
* 09setht (https://github.com/09setht)
* Zertz (https://github.com/Zertz)
* Ph3n1x (https://github.com/Ph3n1x)
* Emre Efendioğlu (https://github.com/emreefendioglu)
* Tim Mckenzie (https://github.com/timmckenzie)
* Emil Janitzek (https://github.com/wiggin)
* Daniel Henrique Joppi (https://github.com/danieljoppi)
* Caleb Meredith (https://github.com/CalebMer)
* David Souther (https://github.com/DavidSouther)
* Marco Cameriero (https://github.com/95ulisse)
* Jan Melcher (https://github.com/Yogu)
* Urs Wolfer (https://github.com/uwolfer)
* Thomas Forrer (https://github.com/forrert)

## Formalia

```
Copyright (C) 2013 by Florian Holzapfel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
