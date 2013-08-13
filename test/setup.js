var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

var assert = require('assertmessage');

var Customer = new Schema({
    name: { type: String, required: true },
    comment: { type: String }
});

var setup = module.exports = function () {
    var self = this;

    if (setup.customerModel) {
        setup.customerModel = mongoose.model('Customer', Customer);
    }

    before(function (done) {
        mongoose.connect('mongodb://localhost/database', function (err) {
            assert(!err, err);
            setup.customerModel.remove(done);
        });
    });

    after(function (done) {
        mongoose.connection.close(done);
    });
};

setup.customerModel = {};