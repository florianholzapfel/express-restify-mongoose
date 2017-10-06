# express-restify-mongoose-patch

Easily create a flexible REST interface for mongoose models.
This module is intended to be only temporary implementation enabling RFC6902 (JSON patch).
It works exactly as the original express-restify-mongoose module.
A pull request is pending on the original module, as soon as it will be accepted this module will be deleted.

The original idea came out from this discussion: https://github.com/florianholzapfel/express-restify-mongoose/issues/224

## Caveats

* mongoose-json-patch must be pluged by the user in schema definition. I tried to plug it addressing model.schema inside express-restify-mongoose module without success.
* The structure of this module is a chain of middlewares and it was too hard for me to distinguish the behavior between PATCH with application/json and the one with application/json-patch+json. So in my implementation PATCH with application/json doesn't use findOneAndUpdate even if the correspondent option is true because I needed to run the filterAndFindById instead.
* To use this implementation bodyParser.json has to accept application/json-patch+json content type so in the application must be declared something like:
```
router.use (bodyParser.json({strict:false, type: (req) => {
var ct = req.headers['content-type'];
return (ct === 'application/json-patch+json') || (ct === 'application/json');
}}));
```
otherwise req.body will be empty and won't be applied any patch.


## Getting started

> **From 1.0.0 onwards, the library is only compatible with mongoose >= 4. For mongoose 3.x compatibility, use the 0.7.x branch.**

```sh
npm install express-restify-mongoose-patch --save
```

## Documentation

[https://florianholzapfel.github.io/express-restify-mongoose/](https://florianholzapfel.github.io/express-restify-mongoose/)

## License (MIT)

```
Copyright (C) 2013 by Florian Holzapfel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
