import assert from "assert";
import mongoose from "mongoose";
import request from "request";
import sinon from "sinon";
import { serve } from "../../dist/express-restify-mongoose.js";

import setupDb from "./setup.mjs";

export default function (createFn, setup, dismantle) {
  const db = setupDb();

  const testPort = 30023;
  const testUrl = `http://localhost:${testPort}`;
  const invalidId = "invalid-id";
  const randomId = new mongoose.Types.ObjectId().toHexString();
  const updateMethods = ["PATCH", "POST", "PUT"];

  describe("preMiddleware/Create/Read/Update/Delete - undefined", () => {
    let app = createFn();
    let server;
    let customer;

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, {
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

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("POST /Customer 201", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            name: "John",
          },
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 201);
          done();
        }
      );
    });

    it("GET /Customer 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          done();
        }
      );
    });

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            done();
          }
        );
      });
    });

    it("DELETE /Customer/:id 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          done();
        }
      );
    });
  });

  describe("preMiddleware", () => {
    let app = createFn();
    let server;
    let customer;
    let options = {
      preMiddleware: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    afterEach(() => {
      options.preMiddleware.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("GET /Customer 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.preMiddleware);
          let args = options.preMiddleware.args[0];
          assert.equal(args.length, 3);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("GET /Customer/:id 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.preMiddleware);
          let args = options.preMiddleware.args[0];
          assert.equal(args.length, 3);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("POST /Customer 201", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            name: "Pre",
          },
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 201);
          sinon.assert.calledOnce(options.preMiddleware);
          let args = options.preMiddleware.args[0];
          assert.equal(args.length, 3);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("POST /Customer 400 - not called (missing content type)", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 400);
          assert.deepEqual(JSON.parse(body), {
            name: "Error",
            message: "missing_content_type",
          });
          sinon.assert.notCalled(options.preMiddleware);
          done();
        }
      );
    });

    it("POST /Customer 400 - not called (invalid content type)", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          formData: {},
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 400);
          assert.deepEqual(JSON.parse(body), {
            name: "Error",
            message: "invalid_content_type",
          });
          sinon.assert.notCalled(options.preMiddleware);
          done();
        }
      );
    });

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            sinon.assert.calledOnce(options.preMiddleware);
            let args = options.preMiddleware.args[0];
            assert.equal(args.length, 3);
            assert.equal(typeof args[2], "function");
            done();
          }
        );
      });

      it(`${method} /Customer/:id 400 - not called (missing content type)`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 400);
            assert.deepEqual(JSON.parse(body), {
              name: "Error",
              message: "missing_content_type",
            });
            sinon.assert.notCalled(options.preMiddleware);
            done();
          }
        );
      });

      it(`${method} /Customer/:id 400 - not called (invalid content type)`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            formData: {},
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 400);
            assert.deepEqual(JSON.parse(body), {
              name: "Error",
              message: "invalid_content_type",
            });
            sinon.assert.notCalled(options.preMiddleware);
            done();
          }
        );
      });
    });

    it("DELETE /Customer 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          sinon.assert.calledOnce(options.preMiddleware);
          let args = options.preMiddleware.args[0];
          assert.equal(args.length, 3);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("DELETE /Customer/:id 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          sinon.assert.calledOnce(options.preMiddleware);
          let args = options.preMiddleware.args[0];
          assert.equal(args.length, 3);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });
  });

  describe("preCreate", () => {
    let app = createFn();
    let server;
    let options = {
      preCreate: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    afterEach(() => {
      options.preCreate.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("POST /Customer 201", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            name: "Bob",
          },
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 201);
          sinon.assert.calledOnce(options.preCreate);
          let args = options.preCreate.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.name, "Bob");
          assert.equal(args[0].erm.statusCode, 201);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });
  });

  describe("preRead", () => {
    let app = createFn();
    let server;
    let customer;
    let options = {
      preRead: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    afterEach(() => {
      options.preRead.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("GET /Customer 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.preRead);
          let args = options.preRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result[0].name, "Bob");
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("GET /Customer/count 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/count`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.preRead);
          let args = options.preRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.count, 1);
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("GET /Customer/:id 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.preRead);
          let args = options.preRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.name, "Bob");
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("GET /Customer/:id/shallow 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}/shallow`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.preRead);
          let args = options.preRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.name, "Bob");
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });
  });

  describe("preUpdate", () => {
    let app = createFn();
    let server;
    let customer;
    let options = {
      preUpdate: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    afterEach(() => {
      options.preUpdate.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            sinon.assert.calledOnce(options.preUpdate);
            let args = options.preUpdate.args[0];
            assert.equal(args.length, 3);
            assert.equal(args[0].erm.result.name, "Bobby");
            assert.equal(args[0].erm.statusCode, 200);
            assert.equal(typeof args[2], "function");
            done();
          }
        );
      });

      it(`${method} /Customer/:id 400 - not called (missing content type)`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 400);
            assert.deepEqual(JSON.parse(body), {
              name: "Error",
              message: "missing_content_type",
            });
            sinon.assert.notCalled(options.preUpdate);
            done();
          }
        );
      });

      it(`${method} /Customer/:id 400 - not called (invalid content type)`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            formData: {},
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 400);
            assert.deepEqual(JSON.parse(body), {
              name: "Error",
              message: "invalid_content_type",
            });
            sinon.assert.notCalled(options.preUpdate);
            done();
          }
        );
      });
    });
  });

  describe("preDelete", () => {
    let app = createFn();
    let server;
    let customer;
    let options = {
      preDelete: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    afterEach(() => {
      options.preDelete.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("DELETE /Customer 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          sinon.assert.calledOnce(options.preDelete);
          let args = options.preDelete.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result, undefined);
          assert.equal(args[0].erm.statusCode, 204);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("DELETE /Customer/:id 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          sinon.assert.calledOnce(options.preDelete);
          let args = options.preDelete.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result, undefined);
          assert.equal(args[0].erm.statusCode, 204);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });
  });

  describe("postCreate/Read/Update/Delete - undefined", () => {
    let app = createFn();
    let server;
    let customer;

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, {
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

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("POST /Customer 201", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            name: "John",
          },
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 201);
          done();
        }
      );
    });

    it("GET /Customer 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          done();
        }
      );
    });

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request.post(
          {
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            done();
          }
        );
      });
    });

    it("DELETE /Customer/:id 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          done();
        }
      );
    });
  });

  describe("postCreate", () => {
    let app = createFn();
    let server;
    let options = {
      postCreate: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    afterEach(() => {
      options.postCreate.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("POST /Customer 201", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            name: "Bob",
          },
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 201);
          sinon.assert.calledOnce(options.postCreate);
          let args = options.postCreate.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.name, "Bob");
          assert.equal(args[0].erm.statusCode, 201);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("POST /Customer 400 - missing required field", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            comment: "Bar",
          },
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 400);
          assert.deepEqual(body, {
            name: "ValidationError",
            _message: "Customer validation failed",
            message:
              "Customer validation failed: name: Path `name` is required.",
            errors: {
              name: {
                kind: "required",
                message: "Path `name` is required.",
                name: "ValidatorError",
                path: "name",
                properties: {
                  fullPath: "name",
                  message: "Path `name` is required.",
                  path: "name",
                  type: "required",
                },
              },
            },
          });
          sinon.assert.notCalled(options.postCreate);
          done();
        }
      );
    });
  });

  describe("postRead", () => {
    let app = createFn();
    let server;
    let customer;
    let options = {
      postRead: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    afterEach(() => {
      options.postRead.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("GET /Customer 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.postRead);
          let args = options.postRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result[0].name, "Bob");
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("GET /Customer/count 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/count`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.postRead);
          let args = options.postRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.count, 1);
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("GET /Customer/:id 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.postRead);
          let args = options.postRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.name, "Bob");
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("GET /Customer/:id 404", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${randomId}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 404);
          sinon.assert.notCalled(options.postRead);
          done();
        }
      );
    });

    it("GET /Customer/:id 404 - invalid id", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${invalidId}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 404);
          sinon.assert.notCalled(options.postRead);
          done();
        }
      );
    });

    it("GET /Customer/:id/shallow 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}/shallow`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.postRead);
          let args = options.postRead.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.name, "Bob");
          assert.equal(args[0].erm.statusCode, 200);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });
  });

  describe("postUpdate", () => {
    let app = createFn();
    let server;
    let customer;
    let options = {
      postUpdate: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    afterEach(() => {
      options.postUpdate.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            sinon.assert.calledOnce(options.postUpdate);
            let args = options.postUpdate.args[0];
            assert.equal(args.length, 3);
            assert.equal(args[0].erm.result.name, "Bobby");
            assert.equal(args[0].erm.statusCode, 200);
            assert.equal(typeof args[2], "function");
            done();
          }
        );
      });

      it(`${method} /Customer/:id 404 - random id`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${randomId}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 404);
            sinon.assert.notCalled(options.postUpdate);
            done();
          }
        );
      });

      it(`${method} /Customer/:id 404 - invalid id`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${invalidId}`,
            json: {
              name: "Bobby",
            },
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 404);
            sinon.assert.notCalled(options.postUpdate);
            done();
          }
        );
      });

      it(`${method} /Customer/:id 400 - not called (missing content type)`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 400);
            assert.deepEqual(JSON.parse(body), {
              name: "Error",
              message: "missing_content_type",
            });
            sinon.assert.notCalled(options.postUpdate);
            done();
          }
        );
      });

      it(`${method} /Customer/:id 400 - not called (invalid content type)`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
            formData: {},
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 400);
            assert.deepEqual(JSON.parse(body), {
              name: "Error",
              message: "invalid_content_type",
            });
            sinon.assert.notCalled(options.postUpdate);
            done();
          }
        );
      });
    });
  });

  describe("postDelete", () => {
    let app = createFn();
    let server;
    let customer;
    let options = {
      postDelete: sinon.spy((req, res, next) => {
        next();
      }),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    beforeEach((done) => {
      db.reset((err) => {
        if (err) {
          return done(err);
        }

        db.models.Customer.create({
          name: "Bob",
        })
          .then((createdCustomer) => {
            customer = createdCustomer;
          })
          .then(done)
          .catch(done);
      });
    });

    afterEach(() => {
      options.postDelete.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("DELETE /Customer 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          sinon.assert.calledOnce(options.postDelete);
          let args = options.postDelete.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result, undefined);
          assert.equal(args[0].erm.statusCode, 204);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("DELETE /Customer/:id 204", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 204);
          sinon.assert.calledOnce(options.postDelete);
          let args = options.postDelete.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result, undefined);
          assert.equal(args[0].erm.statusCode, 204);
          assert.equal(typeof args[2], "function");
          done();
        }
      );
    });

    it("DELETE /Customer/:id 404", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${randomId}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 404);
          sinon.assert.notCalled(options.postDelete);
          done();
        }
      );
    });

    it("DELETE /Customer/:id 404 - invalid id", (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${invalidId}`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 404);
          sinon.assert.notCalled(options.postDelete);
          done();
        }
      );
    });
  });

  describe("postCreate yields an error", () => {
    let app = createFn();
    let server;
    let options = {
      postCreate: sinon.spy((req, res, next) => {
        next(new Error("Something went wrong"));
      }),
      postProcess: sinon.spy(),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    afterEach(() => {
      options.postCreate.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    // TODO: This test is weird
    it("POST /Customer 201", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            name: "Bob",
          },
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 400);
          sinon.assert.calledOnce(options.postCreate);
          let args = options.postCreate.args[0];
          assert.equal(args.length, 3);
          assert.equal(args[0].erm.result.name, "Bob");
          assert.equal(args[0].erm.statusCode, 400);
          assert.equal(typeof args[2], "function");
          sinon.assert.notCalled(options.postProcess);
          done();
        }
      );
    });
  });

  describe("postProcess", () => {
    let app = createFn();
    let server;
    let options = {
      postProcess: sinon.spy(),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    afterEach(() => {
      options.postProcess.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("GET /Customer 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.postProcess);
          let args = options.postProcess.args[0];
          assert.equal(args.length, 2);
          assert.deepEqual(args[0].erm.result, []);
          assert.equal(args[0].erm.statusCode, 200);
          done();
        }
      );
    });
  });

  describe("postProcess (async outputFn)", () => {
    let app = createFn();
    let server;
    let options = {
      outputFn: (req, res) => {
        if (app.isRestify) {
          res.send(200);
        } else {
          res.sendStatus(200);
        }

        return Promise.resolve();
      },
      postProcess: sinon.spy(),
      restify: app.isRestify,
    };

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Customer, options);

        server = app.listen(testPort, done);
      });
    });

    afterEach(() => {
      options.postProcess.resetHistory();
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("GET /Customer 200", (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 200);
          sinon.assert.calledOnce(options.postProcess);
          let args = options.postProcess.args[0];
          assert.equal(args.length, 2);
          assert.deepEqual(args[0].erm.result, []);
          assert.equal(args[0].erm.statusCode, 200);
          done();
        }
      );
    });
  });
}
