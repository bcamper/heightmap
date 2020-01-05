import Polygon, { Vertex } from './polygon';
import Display from './display';

export default class HeightmapPolygon extends Polygon {
	xheights: Int16Array;
	xheights_empty: Int16Array;

	constructor(vertexes: Vertex[], display: Display) {
		super(vertexes, display);

		// Tracks the highest point rendered so far for each x value
		this.xheights = new Int16Array(this.display.width);

		// Resets x values each frame so that we only need to allocate the array once
		this.xheights_empty = new Int16Array(this.display.width);
		for (let i = 0; i < this.xheights_empty.length; i++) {
			this.xheights_empty[i] = this.display.height;
		}
	}

	renderHeightmap() {
		const { width, height, pixels } = this.display;

		if (this.texture == null) {
			return;
		}

		this.display.startFrameTimer();

		this.rasterize(['u', 'v']);
		this.xheights.set(this.xheights_empty);

		// Render scanlines bottom to top, to minimize # of pixels drawn (no hidden terrain will be rendered)
		for (let y = this.ymax; y >= this.ymin; y--) {
			let u = this.leftEdgeProperties.u[y];
			let v = this.leftEdgeProperties.v[y];

			const udelta = this.rowPropertyDeltas.u[y];
			const vdelta = this.rowPropertyDeltas.v[y];

			let left = this.leftEdges[y];
			let right = this.rightEdges[y];

			// Clip left/right of screen
			if (left < 0) {
				u += (-left) * udelta;
				v += (-left) * vdelta;
				left = 0;
			}

			if (right >= width) {
				right = width;
			}

			// Render scanline
			for (let x = left; x < right; x++) {
				// Get texture value - using ~~ integer typecast notation was faster than Math.round()
				const t = this.tex32[((~~v) << 8) + (~~u)]; // hard-coded for 256-width texture

				// Determine how high this slice of terrain is
				let h = t >>> 24;
				h = y - h;

				if (h < 0) {
					h = 0;
				}

				// First slice for this x coord?
				if (this.xheights[x] == height) {
					this.xheights[x] = h;
				}

				// Only draw the part of the slice (if any) that is visible (wasn't previously rendered)
				if (h < this.xheights[x]) {
					let off = this.xheights[x] * width + x;

					for (let z = this.xheights[x]; z >= h; z--) {
						pixels[off] = t | (255 << 24);
						off -= width;
					}

					this.xheights[x] = h;
				}

				u += udelta;
				v += vdelta;
			}
		}
		this.display.endFrameTimer();
	}

};
