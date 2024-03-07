import mongoose, { Schema } from "mongoose";

export default function () {
  const ProductSchema = new Schema({
    name: { type: String, required: true },
    department: {
      name: { type: String },
      code: { type: Number },
    },
    price: { type: Number },
  });

  class BaseCustomerSchema extends Schema {
    constructor(definition, options) {
      const def = Object.assign(definition, {
        account: { type: Schema.Types.ObjectId, ref: "Account" },
        name: { type: String, required: true, unique: true },
        comment: { type: String },
        address: { type: String },
        age: { type: Number },
        favorites: {
          animal: { type: String },
          color: { type: String },
          purchase: {
            item: { type: Schema.Types.ObjectId, ref: "Product" },
            number: { type: Number },
          },
        },
        purchases: [
          {
            item: { type: Schema.Types.ObjectId, ref: "Product" },
            number: { type: Number },
          },
        ],
        returns: [{ type: Schema.Types.ObjectId, ref: "Product" }],
        creditCard: { type: String, access: "protected" },
        ssn: { type: String, access: "private" },
        coordinates: { type: [Number], index: "2dsphere" },
      });

      super(def, options);
    }
  }

  const CustomerSchema = new BaseCustomerSchema(
    {},
    {
      toObject: { virtuals: true },
      toJSON: { virtuals: true },
    }
  );

  CustomerSchema.virtual("info").get(function () {
    return this.name + " is awesome";
  });

  const InvoiceSchema = new Schema(
    {
      customer: { type: Schema.Types.ObjectId, ref: "Customer" },
      amount: { type: Number },
      receipt: { type: String },
      products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    },
    {
      toObject: { virtuals: true },
      toJSON: { virtuals: true },
      versionKey: "__version",
    }
  );

  const RepeatCustomerSchema = new BaseCustomerSchema({
    account: { type: Schema.Types.ObjectId, ref: "Account" },
    visits: { type: Number },
    status: { type: String },
    job: { type: String },
  });

  const AccountSchema = new Schema({
    accountNumber: String,
    points: Number,
  });

  const HooksSchema = new Schema({
    preSaveError: Boolean,
    postSaveError: Boolean,
  });

  HooksSchema.pre("save", true, function (next, done) {
    next();
    setTimeout(() => {
      done(this.preSaveError ? new Error("AsyncPreSaveError") : null);
    }, 42);
  });

  HooksSchema.post("save", function (doc, next) {
    setTimeout(() => {
      next(doc.postSaveError ? new Error("AsyncPostSaveError") : null);
    }, 42);
  });

  function initialize(opts, callback) {
    if (typeof opts === "function") {
      callback = opts;
      opts = {};
    }

    opts = {
      connect: true,
      ...opts,
    };

    if (!mongoose.models.Customer) {
      mongoose.model("Customer", CustomerSchema);
    }

    if (!mongoose.models.Invoice) {
      mongoose.model("Invoice", InvoiceSchema);
    }

    if (!mongoose.models.Product) {
      mongoose.model("Product", ProductSchema);
    }

    if (!mongoose.models.RepeatCustomer) {
      mongoose.models.Customer.discriminator(
        "RepeatCustomer",
        RepeatCustomerSchema
      );
    }

    if (!mongoose.models.Account) {
      mongoose.model("Account", AccountSchema);
    }

    if (!mongoose.models.Hook) {
      mongoose.model("Hook", HooksSchema);
    }

    if (opts.connect) {
      const uri = process.env.MONGO_URL || "mongodb://localhost/database";
      mongoose.connect(uri).then(function () {
        callback();
      });
    } else if (typeof callback === "function") {
      callback();
    }
  }

  function reset(callback) {
    Promise.all([
      mongoose.models.Customer.deleteMany().exec(),
      mongoose.models.Invoice.deleteMany().exec(),
      mongoose.models.Product.deleteMany().exec(),
      mongoose.models.RepeatCustomer.deleteMany().exec(),
      mongoose.models.Account.deleteMany().exec(),
    ])
      .then(() => callback())
      .catch(callback);
  }

  function close(callback) {
    mongoose.connection.close(callback);
  }

  return {
    initialize: initialize,
    models: mongoose.models,
    reset: reset,
    close: close,
  };
}
