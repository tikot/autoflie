/*global io, $, d3, Gauge */
'use strict';

var gauges = [];

function createGauge(name, label, min, max, size) {
	var config = {
		size: undefined !== size ? size : 150,
		label: label,
		min: undefined !== min ? min : 0,
		max: undefined !== max ? max : 100,
		minorTicks: 5,
		trackMin: true,
		trackMax: true,
		trackAvg: true
	};

	var range = config.max - config.min;
	config.redZones = [{
		from: config.min + range*0.9,
		to: config.max
	}];

	gauges[name] = new Gauge(name, config);
	gauges[name].render();
}

function createGauges() {
	createGauge('motor1', 'Motor One');
	createGauge('motor2', 'Motor Two');
	createGauge('motor3', 'Motor Three');
	createGauge('motor4', 'Motor Four');
}

function getRandomValue(gauge) {
	var overflow = 0;
	return gauge.config.min - overflow + (gauge.config.max - gauge.config.min + overflow*2) *  Math.random();
}

function updateGauges() {
	for (var key in gauges) {
		var value = getRandomValue(gauges[key]);
		gauges[key].redraw(value);
	}
}

function initialize() {
	createGauges();
}

function Gyro(selector, configuration) {
	this.selector = selector;

	var svg = null;
	var margin = {top: 15, right: 0, bottom: 15, left: 35};

	var n = 20;
	this.random = d3.random.normal(0, 0);
	this.axData = d3.range(n).map(this.random);
	this.ayData = d3.range(n).map(this.random);
	this.azData = d3.range(n).map(this.random);

	this.width = 500 - margin.left - margin.right;
	this.height = 288 - margin.top - margin.bottom;

	var x = d3.scale.linear()
		.domain([0, 19 ])
		.range([0, this.width]);

	var y = d3.scale.linear()
		.domain([-3, 3])
		.range([this.height, 0]);

	this.xAxis = d3.svg.axis()
		.scale(x)
		.orient('bottom')
		.tickSize(-this.height);
	this.yAxis = d3.svg.axis()
		.scale(y)
		.orient('left')
		.ticks(5)
		.tickSize(-this.width);

	this.line = d3.svg.line()
		.x(function(d, i) {
			return x(i);
		})
		.y(function(d, i) {
			return y(d);
		});

	this.render = function() {
		svg = d3.select(this.selector).append('svg')
			.attr('width', this.width + margin.left + margin.right)
			.attr('height', this.height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		svg.append('defs').append('clipPath')
			.attr('id', 'clip')
			.append('rect')
			.attr('width', this.width)
			.attr('height', this.height);

		svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + this.height + ')')
			.call(this.xAxis);

		svg.append('g')
			.attr('class', 'y axis')
			.call(this.yAxis);

		this.pathX = svg.append('g')
			.attr('clip-path', 'url(#clip)')
			.append('path')
			.datum(this.axData)
			.attr('class', 'line-x')
			.attr('d', this.line);

		this.pathY = svg.append('g')
			.attr('clip-path', 'url(#clip)')
			.append('path')
			.datum(this.ayData)
			.attr('class', 'line-y')
			.attr('d', this.line);

		this.pathZ = svg.append('g')
			.attr('clip-path', 'url(#clip)')
			.append('path')
			.datum(this.azData)
			.attr('class', 'line-z')
			.attr('d', this.line);

	};

	this.tickX = function(ax) {
		this.axData.push(ax);
		this.pathX
			.attr('d', this.line)
			.attr('transform', null)
			.transition()
			.ease('linear')
			.attr('transform', 'translate(' + x(-1) + ',0 )');
		this.axData.shift();
	};

	this.tickY = function(ay) {
		this.ayData.push(ay);
		this.pathY
			.attr('d', this.line)
			.attr('transform', null)
			.transition()
			.ease('linear')
			.attr('transform', 'translate(' + x(-1) + ',0)');
		this.ayData.shift();
	};

	this.tickZ = function(az) {
		// push a new data point onto the back
		this.azData.push(az);

		// redraw the line, and slide it to the left
		this.pathZ
			.attr('d', this.line)
			.attr('transform', null)
			.transition()
			// .duration(500)
			.ease('linear')
			.attr('transform', 'translate(' + x(-1) + ',0)');
			// .each('end', this.tick);

		// pop the old data point off the front
		this.azData.shift();
	};

}

var g = new Gyro('#acc', '');
g.render();

var socket = io('/autoflie');

function thrust(e) {
    socket.emit('thrust', e.target.value);
}

var thrustInput = document.querySelector('paper-slider');
thrustInput.addEventListener('change', thrust, false);

var controller = $('.control');
var start = controller.find('.start');
var land = controller.find('.land');
var hold = controller.find('.althold');
var connect = controller.find('.connect');
var bail = controller.find('.bail');

start.on('click', function () {
	socket.emit('command', { action: 'start' });
});
land.on('click', function () {
	socket.emit('command', { action: 'land' });
});
hold.on('click', function () {
	socket.emit('command', {action: 'hold'});
});
connect.on('click', function () {
	socket.emit('command', { action: 'connect' });
});
bail.on('click', function () {
	socket.emit('command', { action: 'bail' });
});

var battery = $('#batteryLevel');
socket.on('battery', function (data) {
	battery.val((data.level * 1000 - 2974)/(4153 - 2974) * 100);
});

var thrust = $('#curent-thrust');
socket.on('stabilizer', function (data) {
	thrust.val((data.thrust/65535) * 100);
});

// socket.on('gyro', function (data) {
	 // console.log(data);
// });

socket.on('acc', function (data) {
	g.tickX(data.x);
	g.tickY(data.y);
    g.tickZ(data.z);
});

socket.on('motor', function (data) {
	gauges.motor1.redraw((data.m1/65535) * 100);
	gauges.motor2.redraw((data.m1/65535) * 100);
	gauges.motor3.redraw((data.m1/65535) * 100);
	gauges.motor4.redraw((data.m1/65535) * 100);
});

var ioStatus = document.querySelector('#status');

socket.on('news', function (data) {
	console.log(data);
	if (data.connected) {
		ioStatus.setAttribute('class', 'connected');
	}
	socket.emit('news', { client: 'connected' });
});
socket.on('disconnect', function() {
	console.log('Got disconnect!');
	gauges.motor1.redraw(0);
	gauges.motor2.redraw(0);
	gauges.motor3.redraw(0);
	gauges.motor4.redraw(0);
	ioStatus.setAttribute('class', '');
	thrust.val(0);
	battery.val(0);
});
