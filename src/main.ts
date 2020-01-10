import Display from './display';
import Point from './point';
import Polygon from './polygon';
import HeightmapPolygon from './heightmap';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const pixelRatio = 1; //window.devicePixelRatio;
const display = new Display(560, 560, canvas, { pixelRatio }); // 700, 700

const polygonSize = 225 * pixelRatio;
const polygon = new HeightmapPolygon(Polygon.vertexesForNSided(6, polygonSize, { texture: { width: 256, height: 256 } }), display); // 300
// const polygon = new Polygon(Polygon.vertexesForNSided(6, 225, { texture: { width: 256, height: 256 } }), display); // 300
polygon.position = new Point(0, 50);

// Gradient the vertexes - unused in heightmap demo, but can use with polygon.renderGradient()
polygon.vertexes.forEach(function (vertex, p: number) {
  vertex.r = p * 256 / polygon.vertexes.length + 0;
  vertex.g = ((p + polygon.vertexes.length / 3) % polygon.vertexes.length) * 256 / polygon.vertexes.length + 0;
  vertex.b = ((p + polygon.vertexes.length * 2 / 3) % polygon.vertexes.length) * 256 / polygon.vertexes.length + 0;
});

// Load texture/heightmap and configured
(async () => {
  const img: HTMLImageElement = await Display.loadImage('heightmap.png');

  let palette, p, c;

  polygon.setTexture(Display.dataFromImage(img));

  // Make the terrain palette
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
  })();

  // Keyboard controls - currently unused, but can uncomment input code in render loop to control directly
  let key = null;

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

  // Render loop
  let vel = 0.5;

  function loop (time: number = (+new Date())) {
    display.clearScreen();

    // polygon.renderGradient();
    // polygon.renderEdges(Display.rgba(255, 255, 255));
    // polygon.renderTexture();
    polygon.renderHeightmap();

    polygon.rotation += vel;

    // Input (instead of auto-rotate above)
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

    display.blitScreen();
    display.advanceFrame(time);
    requestAnimationFrame(loop);
  }
