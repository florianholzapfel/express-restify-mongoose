'use strict';

var http = require('http');

exports.allow = function (prereq, onError) {
    return function (req, res, next) {
        var handler = function (err, passed) {
            if (err) {
                return onError(err, req, res, next);
            }
            
            if (!passed) {
                err = new Error(http.STATUS_CODES[403]);
                err.status = 403;
                return onError(err, req, res, next);
            }
            
            next();
        };

        if (prereq.length > 1) {
            prereq(req, handler);
        } else {
            handler(null, prereq(req));
        }
    };
};

exports.access = function (accessFn, onError) {
    return function (req, res, next) {
        var handler = function (err, access) {
            if (err) {
                return onError(err, req, res, next);
            }
            
            if (['public', 'private', 'protected'].indexOf(access) < 0) {
                throw new Error('Unsupported access, must be "public", "private" or "protected"');
            }
            
            req.access = access;
            next();
        };

        if (accessFn.length > 1) {
            accessFn(req, handler);
        } else {
            handler(null, accessFn(req));
        }
    };
};
