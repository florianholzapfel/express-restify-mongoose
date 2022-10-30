import { OutputFn } from "../types";

export function getOutputFnHandler(isExpress: boolean) {
  const fn: OutputFn = function outputFn(req, res) {
    if (isExpress) {
      if (req.erm.result) {
        res.status(req.erm.statusCode).json(req.erm.result);
      } else {
        res.sendStatus(req.erm.statusCode);
      }
    } else {
      res.send(req.erm.statusCode, req.erm.result);
    }
  };

  return fn;
}
