var MSG_403 = 'Unauthorized';

exports.allow = function (usingExpress, prereq) {
    return function (req, res, next) {
        var handler = function (passed) {
            if (!passed) {
				if(usingExpress) {
                    return res.status(403).send(MSG_403);
				} else {
	                return res.send(403, {msg: MSG_403});
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
