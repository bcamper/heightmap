"use strict";

/***** Polygon *****/

function Polygon (vertices, options)
{
	var options = options || {};

	this.display = options.display || window.display;
	this.vertices = vertices; // vertices must be clockwise
	this.position = Point(0, 0);
	this.rotation = 0;
	// this.tilt = 1;
	// this.zoom = 1;

	this.left_edges = new Int16Array(this.display.height);
	this.right_edges = new Int16Array(this.display.height);

	this.left_edge_properties = {};
	this.right_edge_properties = {};
	this.row_property_deltas = {};

	// TODO: heightmap-specific, move to subclass?
	this.xheights = new Int16Array(this.display.width);
	this.xheights_empty = new Int16Array(this.display.width);
	for (var i = 0; i < this.xheights_empty.length; i++) {
		this.xheights_empty[i] = this.display.height;
	}
}

// TODO: trace left and right edges in tandem to aid rasterization?
Polygon.prototype.traceEdges = function (transform, property_keys)
{
	var v, vtop, vtop_index = 0, vstart, vend;
	var line, tracer;
	var off;
	var p = Point(0, 0);
	var properties, k, pk;
	var edge;

	if (transform == null) {
		return false;
	}

	if (this.vertices_trans == null) {
		this.vertices_trans = [];
	}

	// Find top vertex
	for (v = 0; v < this.vertices.length; v ++) {
		this.vertices_trans[v] = Point.rotate(this.vertices[v], this.rotation);

		// Some experiments with view transforms
		// this.vertices_trans[v].y /= this.tilt; // can be used for 'three-quarter view' style
		// this.vertices_trans[v].x *= this.zoom;
		// this.vertices_trans[v].y *= this.zoom;

		if (vtop == null || this.vertices_trans[v].y < vtop.y) {
			vtop = this.vertices_trans[v];
			vtop_index = v;
		}
	}

	// Trace all edges
	for (v = 0; v < this.vertices.length; v ++) {
		vstart = this.vertices[(v + vtop_index) % this.vertices.length];
		vend = this.vertices[(v + vtop_index + 1) % this.vertices.length];

		// line = new Line(Point.rotate(vstart, this.rotation), Point.rotate(vend, this.rotation));
		// line = new Line(vstart, vend);
		line = new Line(this.vertices_trans[(v + vtop_index) % this.vertices.length], this.vertices_trans[(v + vtop_index + 1) % this.vertices.length]);

		// TODO: allow properties to be set via a provided function, to support different data structures
		// property_keys[k](vstart, vend) -> returns [from, to]
		if (property_keys) {
			properties = {};
			for (k in property_keys) {
				pk = property_keys[k];
				properties[pk] = [vstart[pk], vend[pk]];
			}
		}

		edge = 'right';
		if (line.end.y < line.start.y) {
			edge = 'left';
		}
		else if (line.end.y == line.start.y) {
			edge = 'both';
		}

		tracer = new Line.Tracer(line, properties);

		// Trace edge, and run transform function on each pixel
		while (tracer.position != null) {
			p.x = tracer.position.x + this.position.x + this.display.origin.x;
			p.y = tracer.position.y + this.position.y + this.display.origin.y;
			transform.call(this, p, tracer.properties, edge);
			tracer.next();
		}
	}

	return true;
};

Polygon.prototype.renderEdges = function (color)
{
	this.traceEdges(
		function renderEdgesTraceEdges (p) {
			this.display.pixels[p.y * this.display.width + p.x] = color;
		}
	);
};

// TODO: move rasterized info separate object/data structure from core polygon
Polygon.prototype.rasterize = function (property_keys, transform, edge)
{
	var polygon = this;
	var property_keys = property_keys || [];
	var k, p, pk, width, y;
	var args;

	this.ymin = null;
	this.ymax = null;
	
	for (y = 0; y < this.display.height; y++) {
		this.left_edges[y] = -1;
		this.right_edges[y] = -1;
	}

	for (k in property_keys) {
		pk = property_keys[k];

		if (this.left_edge_properties[pk] == null) {
			this.left_edge_properties[pk] = new Float32Array(this.display.height);
		}

		if (this.right_edge_properties[pk] == null) {
			this.right_edge_properties[pk] = new Float32Array(this.display.height);
		}

		if (this.row_property_deltas[pk] == null) {
			this.row_property_deltas[pk] = new Float32Array(this.display.height);
		}
	}

	this.traceEdges(
		function rasterizeTraceEdges (p, properties, edge) {
			var left, right, k;

			if (edge == 'left' || edge == 'both') {
				left = this.left_edges[p.y];
				if (left == -1 || p.x < left) {
					this.left_edges[p.y] = p.x;

					for (k in properties) {
						this.left_edge_properties[k][p.y] = properties[k];
					}
				}
			}
			else if (edge == 'right' || edge == 'both') {
				right = this.right_edges[p.y];
				if (right == -1 || p.x > right) {
					this.right_edges[p.y] = p.x;

					for (k in properties) {
						this.right_edge_properties[k][p.y] = properties[k];
					}
				}
			}

			// TODO: get min/max by detecting top/bottom vertices directly
			if (this.ymin == null || p.y < this.ymin) {
				this.ymin = p.y;
			}

			if (this.ymax == null || p.y > this.ymax) {
				this.ymax = p.y;
			}
		},
		property_keys
	);

	// Clip
	if (this.ymin < 0) {
		this.ymin = 0;
	}
	else if (this.ymax >= this.display.height) {
		this.ymax = this.display.height - 1;
	}

	// Pre-compute raster property deltas
	for (y = this.ymin; y <= this.ymax; y++) {
		width = this.right_edges[y] - this.left_edges[y];
		for (k in property_keys) {
			pk = property_keys[k];
			this.row_property_deltas[pk][y] = (this.right_edge_properties[pk][y] - this.left_edge_properties[pk][y]) / width;
		}
	}

	// NOTE: have mostly deprecated / not using this per-scanline callback method, 
	// because it is too slow (defeats optimizations? function call overhead too high?)

	// Transform/render each scanline
	if (transform == null) {
		return;
	}

	// this.display.startFrameTimer();
	args = [];
	for (y = this.ymax; y >= this.ymin; y--) {
		p = 0;
		args[p++] = y;
		args[p++] = this.left_edges[y];
		args[p++] = this.right_edges[y];

		for (k in property_keys) {
			pk = property_keys[k];
			args[p++] = this.left_edge_properties[pk][y];
			args[p++] = this.row_property_deltas[pk][y];
		}

		transform.apply(this, args);
	}
	// this.display.endFrameTimer();
};

Polygon.prototype.renderGradient = function ()
{
	var x, off;

	this.rasterize(
		['r', 'g', 'b'],
		function renderScanline (y, left, right, r, rdelta, g, gdelta, b, bdelta) {
			off = y * this.display.width + left;

			for (x = left; x < right; x ++, off ++) {
				this.display.pixels[off] = r + (g << 8) + (b << 16) + (255 << 24);

				r += rdelta;
				g += gdelta;
				b += bdelta;
			}
		}
	);
};

Polygon.prototype.renderTexture = function ()
{
	var x, y, off;
	var u, udelta;
	var v, vdelta;
	var left, right;

	if (this.texture == null) {
		return;
	}

	this.rasterize(['u', 'v']);

	this.display.startFrameTimer();
	for (y = this.ymin; y < this.ymax; y ++) {
		u = this.left_edge_properties.u[y];
		udelta = this.row_property_deltas.u[y];

		v = this.left_edge_properties.v[y];
		vdelta = this.row_property_deltas.v[y];

		left = this.left_edges[y];
		right = this.right_edges[y];

		off = y * this.display.width + left;
		for (x = left; x < right; x ++) {
			this.display.pixels[off] = this.tex32[((~~v) << 8) + (~~u)];

			u += udelta;
			v += vdelta;
			off ++;
		}
	}
	this.display.endFrameTimer();
};

// TODO: heightmap-specific, move to subclass?
Polygon.prototype.renderHeightMap = function ()
{
	var x, y, off;
	var u, udelta;
	var v, vdelta;
	var left, right;
	var t, h, z;

	// Local vars as aliases performed better under profiling
	var width = this.display.width;
	var height = this.display.height;
	var pixels = this.display.pixels;
	var tex32 = this.tex32;
	var xheights = this.xheights;

	if (this.texture == null) {
		return;
	}

	this.display.startFrameTimer();
	
	this.rasterize(['u', 'v']);

	this.xheights.set(this.xheights_empty);

	for (y = this.ymax; y >= this.ymin; y --) {
		u = this.left_edge_properties.u[y];
		v = this.left_edge_properties.v[y];

		udelta = this.row_property_deltas.u[y];
		vdelta = this.row_property_deltas.v[y];

		left = this.left_edges[y];
		right = this.right_edges[y];

		// Clip left/right of screen
		if (left < 0) {
			u += (-left) * udelta;
			v += (-left) * vdelta;
			left = 0;
		}

		if (right >= width) {
			right = width;
		}

		for (x = left; x < right; x ++) {
			t = tex32[((~~v) << 8) + (~~u)]; // hard-coded for 256-width texture

			h = t >>> 24;
			h = y - h;

			if (h < 0) {
				h = 0;
			}

			if (xheights[x] == height) {
				xheights[x] = h;
			}

			if (h < xheights[x]) {
				off = xheights[x] * width + x;

				for (z = xheights[x]; z >= h; z --) {
					pixels[off] = t | (255 << 24);
					off -= width;
				}

				xheights[x] = h;
			}

			u += udelta;
			v += vdelta;
		}
	}
	this.display.endFrameTimer();
};

Polygon.Factory = {};
Polygon.Factory.nSided = function (n, size, options)
{
	var options = options || {};
	var vertices = [];
	var angle = 360 / n;
	var angle_off = (n & 1) ? 0 : (-angle / 2);
	var p = Point(0, -size);
	var i;

	for (i = 0; i < n; i ++) {
		vertices[i] = Point.rotate(p, angle * i + angle_off);

		// Fit texture to polygon
		if (options.texture != null) {
			vertices[i].u = (vertices[i].x + size) / size / 2 * options.texture.width;
			vertices[i].v = (vertices[i].y + size) / size / 2 * options.texture.height;
			// log("u: " + vertices[i].u + ", v: " + vertices[i].v);
		}
	}

	// Testing more precise texture fitting
	// if (options.texture != null) {
	// 	var xmin, xmax, ymin, ymax;
	// 	vertices.forEach(function (vertex) {
	// 		if (xmin == null || vertex.x < xmin) {
	// 			xmin = vertex.x;
	// 		}
	// 		if (xmax == null || vertex.x > xmax) {
	// 			xmax = vertex.x;
	// 		}

	// 		if (ymin == null || vertex.y < ymin) {
	// 			ymin = vertex.y;
	// 		}
	// 		if (ymax == null || vertex.y > ymax) {
	// 			ymax = vertex.y;
	// 		}
	// 	});

	// 	vertices.forEach(function (vertex) {
	// 		vertex.u = (vertex.x - xmin) / (xmax - xmin) * (options.texture.width - 2) + 1;
	// 		vertex.v = (vertex.y - ymin) / (ymax - ymin) * (options.texture.height - 2) + 1;
	// 		// log("u: " + vertex.u + ", v: " + vertex.v);
	// 	});
	// }

	return new Polygon(vertices, { display: options.display });
};