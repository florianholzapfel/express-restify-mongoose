import assert from "assert";
import request from "request";
import { serve } from "../../dist/express-restify-mongoose.js";

import setupDb from "./setup.mjs";

export default function (createFn, setup, dismantle) {
  const db = setupDb();

  const testPort = 30023;
  const testUrl = `http://localhost:${testPort}`;
  const updateMethods = ["PATCH", "POST", "PUT"];

  describe("contextFilter", () => {
    let app = createFn();
    let server;
    let customers;

    let contextFilter = function (model, req, done) {
      done(
        model.find({
          name: { $ne: "Bob" },
          age: { $lt: 36 },
        })
      );
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, {
          contextFilter: contextFilter,
          restify: app.isRestify,
        });

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create([
          {
            name: "Bob",
            age: 12,
          },
          {
            name: "John",
            age: 24,
          },
          {
            name: "Mike",
            age: 36,
          },
        ])
          .then((createdCustomers) => {
            customers = createdCustomers;
          })
          .then(done)
          .catch(done);
      });
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("GET /Customer 200 - filtered name and age", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          assert.equal(body.length, 1);
          assert.equal(body[0].name, "John");
          assert.equal(body[0].age, 24);
          done();
        }
      );
    });

    it("GET /Customer/:id 404 - filtered name", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 404);
          done();
        }
      );
    });

    it("GET /Customer/:id/shallow 404 - filtered age", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customers[2]._id}/shallow`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 404);
          done();
        }
      );
    });

    it("GET /Customer/count 200 - filtered name and age", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/count`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          assert.equal(body.count, 1);
          done();
        }
      );
    });

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customers[1]._id}`,
            json: {
              name: "Johnny",
            },
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            assert.equal(body.name, "Johnny");
            done();
          }
        );
      });

      it(`${method} /Customer/:id 404 - filtered name`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 404);

            db.models.Customer.findById(customers[0]._id)
            .then((foundCustomer) => {
              assert.notEqual(foundCustomer.name, "Bobby");
              done();
            })
            .catch(done);          
          }
        );
      });
    });

    it("DELETE /Customer/:id 200", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customers[1]._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);

          db.models.Customer.findById(customers[1]._id)
          .then((foundCustomer) => {
            assert.ok(!foundCustomer);
            done();
          })
          .catch(done);        
        }
      );
    });

    it("DELETE /Customer/:id 404 - filtered age", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customers[2]._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 404);

          db.models.Customer.findById(customers[2]._id)
          .then((foundCustomer) => {
            assert.ok(foundCustomer);
            assert.equal(foundCustomer.name, "Mike");
            done();
          })
          .catch(done);        
        }
      );
    });

    it("DELETE /Customer 200 - filtered name and age", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);

          db.models.Customer.countDocuments()
            .then((count) => {
              assert.equal(count, 2);
              done();
            })
            .catch(done);
        }
      );
    });
  });
}
