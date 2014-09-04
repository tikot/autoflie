
'use strict';

var Aerogel = require('aerogel');
var driver;
var copter;
var copterUri = 'radio://1/7/2MPS';

/**
 * Module exports.
 */
var autoflie = module.exports = {};

// process.on('SIGINT', autoflie.bail);

autoflie.init = function() {
	driver = new Aerogel.CrazyDriver();
	copter = new Aerogel.Copter(driver);
	console.log('init complete');
	// copterUri = copterUri || autoflie.find();

};

autoflie.bail = function() {
    if ( !copter)
        return

	return copter.shutdown()
		.then(function () {
			copter = null;
			copter = null;
			console.log('exit');
			return;
		})
		.fail(function (error) {
			console.log('bail fail');
			console.log(error);
			copter.shutdown();
			return process.exit(0);
		})
		.done();
};

autoflie.news = function(io, news) {
	io.emit('news', { hello: news});
};

autoflie.connect = function(handleTelemetry) {
	autoflie.init();
	driver.findCopters()
		.then(function (copters) {
			if (copters.leanth === 0) {
				console.error('No copters found! Is your copter turned on?');
			}
			if (copters.length === 1) {
				copterUri = copters[0];
			}
			copterUri = copters[0];
			console.log(copters);
			return copters[0];
		})
		.delay(3000)
		.then(function (uri) {
			if (typeof uri === 'undefined') {
				console.log('url is undefined start over');
				uri = 'radio://1/7/2MPS';
			}
			console.log('Using copter at', uri);
			return copter.connect(uri);
		})
		.delay(5000)
		.then(function () {
			console.log('Subscribe emit telemetry!');
			copter.driver.telemetry.subscribe('battery', handleTelemetry.battery.bind(copter));
			copter.driver.telemetry.subscribe('motor', handleTelemetry.motor.bind(copter));
			copter.driver.telemetry.subscribe('stabilizer', handleTelemetry.stabilizer.bind(copter));
			copter.driver.telemetry.subscribe('accelerometer', handleTelemetry.acc.bind(copter));
			// copter.driver.telemetry.subscribe('gyro', handleTelemetry.gyro.bind(copter));
			return;
		})
		.fail(function (error) {
			console.log(error);
			console.log(error.stack);
			copter.shutdown().done();
		})
		.done();

};

autoflie.takeOff = function() {

	copter.copterStates.takeoff();
	copter.setThrust(2001);
	copter.driver.parameters.set('flightmode.althold', true);

	//copter.flightTimer =  setTimeout(function() {
	    copter.copterStates.stabilize();
	//}, 100);

};

autoflie.land = function(io) {
	copter.land()
	.then(function (response) {
		console.log(response);
		if (io) {
			io.emit('end', 0);
		}
	})
	.fail(function (error) {
		console.log(error);
		copter.shutdown()
		.then(function (response) {
			console.log(response);
		});
	})
	.done();
};

autoflie.thrust = function(value) {
	console.log('New thrust ' + value);
	if (copter) {
		copter.nextSetpoint.thrust = Math.round(value);
		copter.flightTimer =  setTimeout(function() {
	        copter.copterStates.stabilize();
	    }, 5000);

	}
};

// DEBUG=express:* node ./bin/www

