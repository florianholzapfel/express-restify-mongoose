'use strict';

var express = require('express'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	test = require('./test');

function Express() {
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(methodOverride());
    return app;
}
function ExpressCustomOutputFunction() {
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(methodOverride());
    app.outputFn = function(res, result, statusCode) {
        res.type('json');
        res.status(statusCode || 200).send(JSON.stringify(result));
    };
    return app;
}

[Express, ExpressCustomOutputFunction].forEach(test);
