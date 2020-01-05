import Display from './display';
import Point from './point';
import LineTracer, { PropertyValueDictionary, PropertyRangeDictionary } from './line';

enum Edge { left, right, both }

export interface Vertex extends Point {
// interface Vertex {
	[index: string]: number; // additional vertex-specific properties
}

interface PropertyValueRowDictionary {
	[index: string]: number[];
}

export default class Polygon {
	display: Display;
	vertexes: Vertex[];
	vertexesTransformed: Point[];
	position: Point;
	rotation: number;

	ymin: number;
	ymax: number;
	leftEdges: Int16Array;
	rightEdges: Int16Array;
	leftEdgeProperties: PropertyValueRowDictionary;
	rightEdgeProperties: PropertyValueRowDictionary;
	rowPropertyDeltas: PropertyValueRowDictionary;

	texture: ImageData;
	tex32: Uint32Array;

	constructor(vertexes: Vertex[], display: Display) {
		this.display = display;
		this.vertexes = vertexes; // vertexes must be clockwise
		this.vertexesTransformed = new Array(this.vertexes.length);
		this.position = new Point(0, 0);
		this.rotation = 0;

		this.ymin = null;
		this.ymax = null;
		this.leftEdges = new Int16Array(this.display.height);
		this.rightEdges = new Int16Array(this.display.height);

		this.leftEdgeProperties = {};
		this.rightEdgeProperties = {};
		this.rowPropertyDeltas = {};
	}

	/* Rasterization methods */

	traceEdges(transform: Function, propertyKeys: string[] = null): boolean {
		if (transform == null) {
			return false;
		}

		// Find top vertex
		let vtop: Point;
		let vtopIndex:number;
		for (let v = 0; v < this.vertexes.length; v ++) {
			this.vertexesTransformed[v] = Point.rotate(this.vertexes[v], this.rotation);

			// Some experiments with view transforms
			// this.vertexesTransformed[v].y /= this.tilt; // can be used for 'three-quarter view' style
			// this.vertexesTransformed[v].x *= this.zoom;
			// this.vertexesTransformed[v].y *= this.zoom;

			if (vtop == null || this.vertexesTransformed[v].y < vtop.y) {
				vtop = this.vertexesTransformed[v];
				vtopIndex = v;
			}
		}

		// Trace all edges
		for (let v = 0; v < this.vertexes.length; v ++) {
			const vstart: Vertex = this.vertexes[(v + vtopIndex) % this.vertexes.length];
			const vend: Vertex = this.vertexes[(v + vtopIndex + 1) % this.vertexes.length];

			const line = {
				start: this.vertexesTransformed[(v + vtopIndex) % this.vertexes.length],
				end: this.vertexesTransformed[(v + vtopIndex + 1) % this.vertexes.length]
			};

			// TODO: allow properties to be set via a provided function, to support different data structures
			// propertyKeys[k](vstart, vend) -> returns [from, to]
			let properties: PropertyRangeDictionary;
			if (propertyKeys) {
				properties = {};
				for (const pk of propertyKeys) {
					properties[pk] = [vstart[pk], vend[pk]];
				}
			}

			let edge:Edge = Edge.right;
			if (line.end.y < line.start.y) {
				edge = Edge.left;
			}
			else if (line.end.y === line.start.y) {
				edge = Edge.both;
			}

			const tracer:LineTracer = new LineTracer(line, properties);

			// Trace edge, and run transform function on each pixel
			const p: Point = new Point(0, 0);
			while (tracer.position != null) {
				p.x = tracer.position.x + this.position.x + this.display.origin.x;
				p.y = tracer.position.y + this.position.y + this.display.origin.y;
				transform.call(this, p, tracer.properties, edge);
				tracer.next();
			}
		}

		return true;
	}

	// TODO: move rasterized info separate object/data structure from core polygon?
	rasterize(propertyKeys: string[] = [], transform: Function = null) {
		this.ymin = null;
		this.ymax = null;

		for (let y = 0; y < this.display.height; y++) {
			this.leftEdges[y] = -1;
			this.rightEdges[y] = -1;
		}

		for (const pk of propertyKeys) {
			if (this.leftEdgeProperties[pk] == null) {
				this.leftEdgeProperties[pk] = new Array(this.display.height);
			}

			if (this.rightEdgeProperties[pk] == null) {
				this.rightEdgeProperties[pk] = new Array(this.display.height);
			}

			if (this.rowPropertyDeltas[pk] == null) {
				this.rowPropertyDeltas[pk] = new Array(this.display.height);
			}
		}

		this.traceEdges(
			function rasterizeTraceEdges(p: Point, properties: PropertyValueDictionary, edge: Edge) {
				// TODO: get min/max by detecting top/bottom vertexes directly
				if (this.ymin == null || p.y < this.ymin) {
						this.ymin = p.y;
				}

				if (this.ymax == null || p.y > this.ymax) {
						this.ymax = p.y;
				}

				// Clip
				if (this.ymin < 0) {
						this.ymin = 0;
						return;
				}
				else if (this.ymax >= this.display.height) {
						this.ymax = this.display.height - 1;
						return;
				}

				// Track edge x coordinates and properties
				if (edge === Edge.left || edge === Edge.both) {
					const left = this.leftEdges[p.y];
					if (left === -1 || p.x < left) {
						this.leftEdges[p.y] = p.x;

						for (const k in properties) {
							this.leftEdgeProperties[k][p.y] = properties[k];
						}
					}
				}
				else if (edge === Edge.right || edge === Edge.both) {
					const right = this.rightEdges[p.y];
					if (right === -1 || p.x > right) {
						this.rightEdges[p.y] = p.x;

						for (const k in properties) {
							this.rightEdgeProperties[k][p.y] = properties[k];
						}
					}
				}
			},
			propertyKeys
		);

		// Pre-compute raster property deltas
		for (let y = this.ymin; y <= this.ymax; y++) {
			const width = this.rightEdges[y] - this.leftEdges[y];
			for (const pk of propertyKeys) {
				this.rowPropertyDeltas[pk][y] = (this.rightEdgeProperties[pk][y] - this.leftEdgeProperties[pk][y]) / width;
			}
		}

		// NOTE: have mostly deprecated / not using this per-scanline callback method,
		// because it is too slow (defeats optimizations? function call overhead too high?)

		// Transform/render each scanline
		if (typeof transform === 'function') {
			// this.display.startFrameTimer();
			const args = [];
			for (let y = this.ymax; y >= this.ymin; y--) {
				let p = 0;
				args[p++] = y;
				args[p++] = this.leftEdges[y];
				args[p++] = this.rightEdges[y];

				for (const pk of propertyKeys) {
					args[p++] = this.leftEdgeProperties[pk][y];
					args[p++] = this.rowPropertyDeltas[pk][y];
				}

				transform.apply(this, args);
			}
			// this.display.endFrameTimer();
		}
	}

	/* Rendering methods */

	renderEdges(color: number) {
		this.traceEdges((p: Point) => {
			this.display.pixels[p.y * this.display.width + p.x] = color;
		});
	}

	renderGradient() {
		this.rasterize(
			['r', 'g', 'b'],
			function renderScanline(
				y: number, left: number, right: number,
				r: number, rdelta: number,
				g: number, gdelta: number,
				b: number, bdelta: number) {

				let off = y * this.display.width + left;

				for (let x = left; x < right; x++, off++) {
					this.display.pixels[off] = r + (g << 8) + (b << 16) + (255 << 24);

					r += rdelta;
					g += gdelta;
					b += bdelta;
				}
			}
		);
	}

	setTexture(imageData: ImageData) {
		this.texture = imageData; // full ImageData reference
		this.tex32 = new Uint32Array(this.texture.data.buffer); // 32-bit reference to data for faster access
	}

	renderTexture() {
		if (this.texture == null) {
			return;
		}

		this.rasterize(['u', 'v']);

		this.display.startFrameTimer();
		for (let y = this.ymin; y <= this.ymax; y++) {
			let u = this.leftEdgeProperties.u[y];
			const udelta = this.rowPropertyDeltas.u[y];

			let v = this.leftEdgeProperties.v[y];
			const vdelta = this.rowPropertyDeltas.v[y];

			const left = this.leftEdges[y];
			const right = this.rightEdges[y];

			let off = y * this.display.width + left;
			for (let x = left; x < right; x++) {
				this.display.pixels[off] = this.tex32[((~~v) << 8) + (~~u)];

				u += udelta;
				v += vdelta;
				off++;
			}
		}
		this.display.endFrameTimer();
	}

	/* Factory methods */

	static vertexesForNSided(n: number, size: number, options: { texture?: { width: number, height: number } } = {}): Vertex[] {
		const vertexes: Vertex[] = [];
		const angle: number = 360 / n;
		const angleOff: number = (n & 1) ? 0 : (-angle / 2);
		const p = new Point(0, -size);

		for (let i = 0; i < n; i ++) {
			vertexes[i] = Point.rotate(p, angle * i + angleOff) as Vertex;

			// Fit texture to polygon
			if (options.texture != null) {
				vertexes[i].u = (vertexes[i].x + size) / size / 2 * options.texture.width;
				vertexes[i].v = (vertexes[i].y + size) / size / 2 * options.texture.height;
				// log("u: " + vertexes[i].u + ", v: " + vertexes[i].v);
			}
		}

		// Testing more precise texture fitting
		// if (options.texture != null) {
		// 	var xmin, xmax, ymin, ymax;
		// 	vertexes.forEach(function (vertex) {
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

		// 	vertexes.forEach(function (vertex) {
		// 		vertex.u = (vertex.x - xmin) / (xmax - xmin) * (options.texture.width - 2) + 1;
		// 		vertex.v = (vertex.y - ymin) / (ymax - ymin) * (options.texture.height - 2) + 1;
		// 		// log("u: " + vertex.u + ", v: " + vertex.v);
		// 	});
		// }

		return vertexes;
	}

}
