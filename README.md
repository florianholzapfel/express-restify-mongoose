# express-restify-mongoose
This library provides mongoose database models with a REST interface.

[![Build Status](https://travis-ci.org/florianholzapfel/express-restify-mongoose.png?branch=master)](https://travis-ci.org/florianholzapfel/express-restify-mongoose)

## Getting started

In your shell, install with npm:

```sh
npm install express-restify-mongoose
```

In your code:

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

```
GET http://localhost/api/v1/Customers/count
GET http://localhost/api/v1/Customers
PUT http://localhost/api/v1/Customers
POST http://localhost/api/v1/Customers
DELETE http://localhost/api/v1/Customers

GET http://localhost/api/v1/Customers/:id
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
GET http://localhost/api/v1/Customers?select=name
```

### Ordering
```
GET http://localhost/api/v1/Customers?order=name
GET http://localhost/api/v1/Customers?skip=10&limit=10
```

### Populate Fields
```
GET http://localhost/api/v1/Invoices?populate=customer
```

## Reference
### serve
```
serve(app, model, [options])
```

#### arguments
* app - The express app
* model - Your mongoose database model
* options - Optional options object
  * prefix - Some path that will be prefixed to the REST path. Defaults to ```/api```
  * version - An API version that will be prefixed to the rest path. Defaults to ```v1```
  * middleware - An express middleware or an array of express middlewares that will be used.
  * plural - If ```true```, does not pluralize the database model name. Default is ```false```
  * lowercase - If ```true```, turn model name to lower case before generating the routes.
  * exclude - String of comma separated field names which are not to be returned by queries.
  * postProcess - A middleware to be called after the response has been sent.
    It is only executed on success.  If an error is sent to the client,
    this is not executed.
  
## Contributors
* Enric León (https://github.com/nothingbuttumbleweed)
* David Higginbotham (https://github.com/dhigginbotham)
* Jonathan Greenemeier (https://github.com/6eDesign)
* Alan Levicki (https://github.com/alevicki)
* Michael (https://github.com/micheee)

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
