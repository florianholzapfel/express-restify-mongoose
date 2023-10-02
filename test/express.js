import bodyParser from "body-parser";
import express from "express";
import methodOverride from "method-override";

import accessTests from "./integration/access.js";
import contextFilterTests from "./integration/contextFilter.js";
import createTests from "./integration/create.js";
import deleteTests from "./integration/delete.js";
import hookTests from "./integration/hooks.js";
import middlewareTests from "./integration/middleware.js";
import optionsTests from "./integration/options.js";
import readTests from "./integration/read.js";
import updateTests from "./integration/update.js";
import virtualsTests from "./integration/virtuals.js";

import setupDb from "./integration/setup.js";

const db = setupDb();

function Express() {
  let app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(methodOverride());
  return app;
}

function setup(callback) {
  db.initialize((err) => {
    if (err) {
      return callback(err);
    }

    db.reset(callback);
  });
}

function dismantle(app, server, callback) {
  db.close((err) => {
    if (err) {
      return callback(err);
    }

    if (app.close) {
      return app.close(callback);
    }

    server.close(callback);
  });
}

function runTests(createFn) {
  describe(createFn.name, () => {
    createTests(createFn, setup, dismantle);
    readTests(createFn, setup, dismantle);
    updateTests(createFn, setup, dismantle);
    deleteTests(createFn, setup, dismantle);
    accessTests(createFn, setup, dismantle);
    contextFilterTests(createFn, setup, dismantle);
    hookTests(createFn, setup, dismantle);
    middlewareTests(createFn, setup, dismantle);
    optionsTests(createFn, setup, dismantle);
    virtualsTests(createFn, setup, dismantle);
  });
}

runTests(Express);
