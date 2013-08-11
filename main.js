"use strict";

var display = new Display(560, 560); // 700, 700

// var polygon = Polygon.Factory.nSided(6, 225, { texture: { width: 256, height: 256 } }); // 300
var polygon = new HeightmapPolygon(Polygon.Factory.verticesForNSided(6, 225, { texture: { width: 256, height: 256 } })); // 300
polygon.position = Point(0, 50);

// Gradient the vertices - unused in heightmap demo, but can use with polygon.renderGradient()
polygon.vertices.forEach(function (vertex, p) {
	vertex.r = p * 256 / polygon.vertices.length + 0;
	vertex.g = ((p + polygon.vertices.length / 3) % polygon.vertices.length) * 256 / polygon.vertices.length + 0;
	vertex.b = ((p + polygon.vertices.length * 2 / 3) % polygon.vertices.length) * 256 / polygon.vertices.length + 0;
});

// Load texture/heightmap and configured
Display.loadImage('heightmap.png', function (img) { 
	var palette, colors, bands, p, c;

	// TOOD: move to Polygon.setTexture function?
	polygon.texture = Display.dataFromImage(img);
	polygon.tex32 = new Uint32Array(polygon.texture.data.buffer);

	palette = Display.makePaletteForGradients(
		{
			pure_blue: [0, 0, 255],
			dark_blue: [0, 26, 255],
			med_blue: [0, 103, 255],
			light_blue: [0, 179, 255],
			dark_green: [0, 80, 13],
			med_green: [64, 128, 0],
			light_green: [128, 196, 0],
			brown: [80, 48, 0],
			white: [252, 252, 252]
		},
		[
			[0, 8, 'pure_blue', 'dark_blue'],
			[8, 24, 'dark_blue', 'med_blue'],
			[24, 32, 'med_blue', 'light_blue'],
			[32, 64, 'dark_green', 'med_green'],
			[64, 120, 'med_green', 'light_green'],
			[120, 180, 'light_green', 'brown'],
			[180, 210, 'brown', 'white'],
			[210, 256, 'white', 'white']
		]
	);

	// Remap grayscale heightmap to palette, and adjust height
	for (p = 0; p < polygon.texture.width * polygon.texture.height; p ++) {
		c = polygon.tex32[p] & 255;										// Only use the red value
		polygon.tex32[p] = palette[c];									// Look-up RGB in palette
		polygon.tex32[p] = Display.setAlpha(polygon.tex32[p], c / 2);	// Scale height by half
	}

	/* Experimenting with alternate, geometric heightmaps */

	// Film noirish city effect
	// for (var y = 0; y < 256; y++) {
	// 	for (var x = 0; x < 256; x++) {
	// 		polygon.tex32[y*256+x] = Display.setAlpha(polygon.tex32[y*256+x], ((x >> 4) & (y >> 4)) << 5);
	// 	}
	// }

	// Sample palette swatch
	// for (p = 0; p < 256; p++) {
	// 	display.background[p + (display.height - 1) * display.width] = palette[p] | (255 << 24);
	// 	display.background[p + (display.height - 2) * display.width] = palette[p] | (255 << 24);
	// 	display.background[p + (display.height - 3) * display.width] = palette[p] | (255 << 24);
	// 	display.background[p + (display.height - 4) * display.width] = palette[p] | (255 << 24);
	// 	display.background[p + (display.height - 5) * display.width] = palette[p] | (255 << 24);
	// }

	// Start rendering
	loop();
});

// Render loop
var vel = 0.5, accel = 0;

function loop (time)
{
	display.clearScreen();

	// polygon.renderEdges(Display.rgba(255, 255, 255));
	// polygon.renderGradient();
	// polygon.renderTexture();
	polygon.renderHeightMap();

	polygon.rotation += vel;

	// // Input - disabled
	// if (key == 'left') {
	// 	polygon.rotation -= 1;
	// }
	// else if (key == 'right') {
	// 	polygon.rotation += 1;
	// }

	// if (key == 'up') {
	// 	polygon.zoom += 0.02;
	// 	if (polygon.zoom > 3) {
	// 		polygon.zoom = 3;
	// 	}
	// }
	// else if (key == 'down') {
	// 	polygon.zoom -= 0.02;
	// 	if (polygon.zoom < 1) {
	// 		polygon.zoom = 1;
	// 	}
	// }

	// Speed up and slow down spinning
	// accel = Math.sin(display.frame * Math.PI / 180) / 64;
	// vel += accel;

	display.advanceFrame(time);
	display.blitScreen();
	requestAnimationFrame(loop);
}

// Keyboard controls - currently unused, but can uncomment input code in render loop to control directly
var key = null;

document.onkeydown = function (event) {
	if (event.keyCode == 37) {
		key = 'left';
	}
	else if (event.keyCode == 39) {
		key = 'right';
	}
	else if (event.keyCode == 38) {
		key = 'up';
	}
	else if (event.keyCode == 40) {
		key = 'down';
	}
}

document.onkeyup = function (event) {
	key = null;
}
