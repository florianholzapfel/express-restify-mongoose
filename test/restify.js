var restify = require('restify'),
	test = require('./test');

function Restify() {
    var app = restify.createServer();
    app.use(restify.queryParser());
    app.use(restify.bodyParser());
    app.isRestify = true;
    return app;
}
function RestifyCustomOutputFunction() {
    var app = restify.createServer();
    app.use(restify.queryParser());
    app.use(restify.bodyParser());
    app.isRestify = true;
    app.outputFn = function(res, result) {
        res.send(result);
    };
    return app;
}

[Restify, RestifyCustomOutputFunction].forEach(test);
