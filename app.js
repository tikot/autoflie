
'use strict';

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'));
var io = require('socket.io')(server);
var cfio = io.of('/autoflie');
var autoflie = require('./autoflie');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

var handleTelemetry = {};
handleTelemetry.battery = function(data) {
	if (cfio) { cfio.emit('battery', data);	}
};
handleTelemetry.motor = function(data) {
	if (cfio){ cfio.emit('motor', data); }
};
handleTelemetry.stabilizer = function(data) {
	if (cfio) { cfio.emit('stabilizer', data); }
};
handleTelemetry.acc = function(data) {
	if (cfio) { cfio.emit('acc', data); }
};
handleTelemetry.gyro = function(data) {
	if (cfio) { cfio.emit('gyro', data); }
};

cfio.on('connection', function (socket) {

	//autoflie.init();
	socket.on('command', function (data) {
		switch(data.action) {
			case 'start':
				autoflie.takeOff();
				console.log('start');
				break;
			case 'land':
				autoflie.land();
				break;
			case 'bail':
				autoflie.bail();
				console.log('bail');
				break;
			case 'connect':
				autoflie.connect(handleTelemetry);
				console.log('connect');
				break;
			case 'disconnect':
				console.log('disconnect');
				break;
			default:
				// default code
				console.log('default');
		}
	});

	socket.on('thrust', function(data) {
		autoflie.thrust(data);
	});

	socket.on('disconnect', function () {
		console.log('Shutting down...');
			//bail();
	});

	socket.emit('news', { connected: true });
	socket.on('my other event', function (data) {
		console.log(data);
	});
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;
