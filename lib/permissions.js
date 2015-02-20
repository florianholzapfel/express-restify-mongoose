'use strict';

var http = require('http');

exports.allow = function (prereq, onError) {
    return function (req, res, next) {
        var handler = function (passed) {
            if (!passed) {
                var err = new Error();
                err.status = 403;
                err.message = http.STATUS_CODES[403];
                return onError(err, req, res, next);
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
