import { ErrorRequestHandler } from "express";
import { serializeError } from "serialize-error";

export function getOnErrorHandler(isExpress: boolean) {
  const fn: ErrorRequestHandler = function onError(err, req, res) {
    const serializedErr = serializeError(err);

    delete serializedErr.stack;

    if (serializedErr.errors) {
      for (const key in serializedErr.errors) {
        delete serializedErr.errors[key].reason;
        delete serializedErr.errors[key].stack;
      }
    }

    res.setHeader("Content-Type", "application/json");

    if (isExpress) {
      res.status(req.erm.statusCode || 500).send(serializedErr);
    } else {
      // @ts-expect-error restify
      res.send(req.erm.statusCode, serializedErr);
    }
  };

  return fn;
}
