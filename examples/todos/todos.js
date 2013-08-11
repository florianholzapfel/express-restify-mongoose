/**
 * todos.js
 *
 * Copyright (C) 2013 by Florian Holzapfel
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
**/
var http = require('http');
var express = require('express');
var path = require('path');
var restify = require('../..');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/todos');
var db = mongoose.connection;

var ToDoSchema = new mongoose.Schema({
	text: { type: String, required: true },
	done: { type: Boolean, default: false }
});
var ToDoModel = mongoose.model('ToDo', ToDoSchema);

var app = express();
app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.errorHandler());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	restify.serve(app, ToDoModel, { 
		//exclude: 'text,done'
	});
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(function(req, res) {
		res.sendfile(path.join(__dirname, 'public/index.html'));
	});
});

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});
