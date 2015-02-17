'use strict';

var http = require('http');

exports.allow = function (usingExpress, prereq) {
    return function (req, res, next) {
        var handler = function (passed) {
            if (!passed) {
				if(usingExpress) {
                    			var err = new Error();
                    			err.status = 403;
                    			next(err);
                    			return;
				} else {
	                return res.send(403, {msg: http.STATUS_CODES[403]});
				}
            }
            next();
        };

        if (prereq.length > 1) {
            prereq(req, handler);
        } else {
            handler(prereq(req));
        }
    };
};

exports.access = function (accessFn) {
    return function (req, res, next) {
        var handler = function (access) {
            req.access = access;
            next();
        };

        if (accessFn.length > 1) {
            accessFn(req, handler);
        } else {
            handler(accessFn(req));
        }
    };
};
