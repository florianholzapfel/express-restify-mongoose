import assert from "assert";
import mongoose, { Schema } from "mongoose";
import { detective } from "../../dist/detective.js";

describe("detective", () => {
  const InvoiceSchema = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    very: {
      deep: {
        ref: { type: Schema.Types.ObjectId, ref: "Reference" },
      },
    },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  });

  mongoose.model("Invoice", InvoiceSchema);

  it("returns undefined when path does not exist", () => {
    const modelName = detective(mongoose.models.Invoice, "foo.bar");

    assert.equal(modelName, undefined);
  });

  it("returns undefined when path is not a ref", () => {
    const modelName = detective(mongoose.models.Invoice, "_id");

    assert.equal(modelName, undefined);
  });

  it("returns the referenced model name", () => {
    const modelName = detective(mongoose.models.Invoice, "customer");

    assert.equal(modelName, "Customer");
  });

  it("returns the referenced model name when ref is an array", () => {
    const modelName = detective(mongoose.models.Invoice, "products");

    assert.equal(modelName, "Product");
  });

  it("returns the referenced model name at a deep path", () => {
    const modelName = detective(mongoose.models.Invoice, "very.deep.ref");

    assert.equal(modelName, "Reference");
  });
});
