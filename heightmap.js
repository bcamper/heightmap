"use strict";

/***** Heightmapped polygon *****/

HeightmapPolygon.prototype = Object.create(Polygon.prototype);

function HeightmapPolygon (vertices, options)
{
	Polygon.apply(this, arguments);

	// Tracks the highest point rendered so far for each x value
	this.xheights = new Int16Array(this.display.width);

	// Resets x values each frame so that we only need to allocate the array once
	this.xheights_empty = new Int16Array(this.display.width);
	for (var i = 0; i < this.xheights_empty.length; i++) {
		this.xheights_empty[i] = this.display.height;
	}
}

HeightmapPolygon.prototype.renderHeightmap = function ()
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

	// Render scanlines bottom to top, to minimize # of pixels drawn (no hidden terrain will be rendered)
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

		// Render scanline
		for (x = left; x < right; x ++) {
			// Get texture value - using ~~ integer typecast notation was faster than Math.round()
			t = tex32[((~~v) << 8) + (~~u)]; // hard-coded for 256-width texture

			// Determine how high this slice of terrain is
			h = t >>> 24;
			h = y - h;

			if (h < 0) {
				h = 0;
			}

			// First slice for this x coord?
			if (xheights[x] == height) {
				xheights[x] = h;
			}

			// Only draw the part of the slice (if any) that is visible (wasn't previously rendered)
			if (h < xheights[x]) {
				// off = xheights[x] * width + x;

				// for (z = xheights[x]; z >= h; z --) {
				// 	pixels[off] = t | (255 << 24);
				// 	off -= width;
				// }

                var c = this.display.context;
                c.beginPath();
                c.moveTo(x, xheights[x]);
                c.lineTo(x, h);
                c.strokeStyle = 'rgba(' + [t & 255, (t >> 8) & 255, (t >> 16) & 255].join(', ') + ', 1.0)';
                c.lineWidth = 2;
                // c.globalCompositeOperation = 'copy';
                c.stroke();

				xheights[x] = h;
			}

			u += udelta;
			v += vdelta;
		}
	}
	this.display.endFrameTimer();
};
