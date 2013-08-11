"use strict";

/***** Line *****/

function Line (start, end)
{
	this.start = start;
	this.end = end;
}

Line.Tracer = function (line, properties)
{
	var k;

	this.line = line;

	// Forces integers / whole pixels
	this.line.start.x = Math.round(this.line.start.x);
	this.line.start.y = Math.round(this.line.start.y);

	this.line.end.x = Math.round(this.line.end.x);
	this.line.end.y = Math.round(this.line.end.y);

	this.position = Point.copy(this.line.start);

	// Bresenham-style line iterator
	this.delta = Point(
		Math.abs(this.line.end.x - this.line.start.x),
		Math.abs(this.line.end.y - this.line.start.y)
	);
	
	this.step = Point(
		(this.line.start.x < this.line.end.x) ? 1 : -1,
		(this.line.start.y < this.line.end.y) ? 1 : -1
	);

	this.accumulator = (this.delta.x >= this.delta.y) ? (this.delta.x / 2) : (this.delta.y / 2);

	// Optionally interpolate between additionally provided named property ranges, passed in the form of:
	// properties = { key1: [from, to], key2: [from, to], ... }
	if (properties != null) {
		this.properties = {};
		this.property_deltas = {};

		for (k in properties) {
			this.properties[k] = properties[k][0];
			this.property_deltas[k] = (properties[k][1] - properties[k][0]);
			if (this.delta.x >= this.delta.y) {
				this.property_deltas[k] /= this.delta.x;
			}
			else {
				this.property_deltas[k] /= this.delta.y;
			}
		}
	}
}

Line.Tracer.prototype.next = function ()
{
	var k;

	if (this.position == null) {
		return null;
	}
	else if (Point.equals(this.position, this.line.end)) {
		this.position = null;
		return null;
	}

	if (this.delta.x >= this.delta.y) {
		this.position.x += this.step.x;

		if (this.step.y != 0) {
			this.accumulator -= this.delta.y;
			if (this.accumulator < 0) {
				this.position.y += this.step.y;
				this.accumulator += this.delta.x;
			}
		}
	}
	else {
		this.position.y += this.step.y;

		if (this.step.x != 0) {
			this.accumulator -= this.delta.x;
			if (this.accumulator < 0) {
				this.position.x += this.step.x;
				this.accumulator += this.delta.y;
			}
		}
	}

	// Additional properties
	if (this.properties != null) {
		for (k in this.properties) {
			this.properties[k] += this.property_deltas[k];
		}
	}
};
