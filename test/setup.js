var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

var assert = require('assertmessage');

var Customer = new Schema({
    name: { type: String, required: true },
    comment: { type: String }
});
var Invoice = new Schema({
	customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
	amount: { type: Number }
}, {
    versionKey: '__version'
});

var setup = module.exports = function () {
    var self = this;

    if (setup.customerModel) {
        setup.customerModel = mongoose.model('Customer', Customer);
    }
    if (setup.invoiceModel) {
        setup.invoiceModel = mongoose.model('Invoice', Invoice);
    }

    before(function (done) {
        mongoose.connect('mongodb://localhost/database', function (err) {
            assert(!err, err);
            setup.customerModel.remove(function (err) {
                assert(!err, err);
                setup.invoiceModel.remove(done);
            });
        });
    });

    after(function (done) {
        mongoose.connection.close(done);
    });
};

setup.customerModel = {};
setup.invoiceModel = {};