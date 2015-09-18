module.exports = function (isExpress) {
  function outputExpress (req, res, data) {
    if (data.result) {
      res.status(data.statusCode).json(data.result)
    } else {
      res.sendStatus(data.statusCode)
    }
  }

  function outputRestify (req, res, data) {
    if (data.result) {
      res.send(data.statusCode, data.result)
    } else {
      res.send(data.statusCode)
    }
  }

  return isExpress ? outputExpress : outputRestify
}
