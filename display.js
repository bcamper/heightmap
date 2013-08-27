/***** Display *****/

function Display (width, height, options)
{
    options = options || {};

    this.frame = 0;
    this.elapsed = 0;
    this.last_time = 0;
    this.fps_sample_range = options.fps_sample_range || 200;
    this.start_frame_time = 0;
    this.frame_time = 0;

    this.width = width;
    this.height = height;
    this.origin = new Point(this.width / 2, this.height / 2);

    this.canvas = document.getElementById(options.canvas_id || 'canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.context = this.canvas.getContext('2d');
    this.canvas_image_data = this.context.createImageData(this.width, this.height);
    this.pixels = new Uint32Array(this.canvas_image_data.data.buffer);
    this.background = new Uint32Array(this.pixels.length);
    this.background.set(this.pixels);

    Display.requestAnimationFrameCompatibility();
}

Display.prototype.clearScreen = function displayclearScreen ()
{
    this.pixels.set(this.background);
};

Display.prototype.blitScreen = function blitScreen ()
{
    this.context.putImageData(this.canvas_image_data, 0, 0);
};

Display.prototype.advanceFrame = function advanceFrame (time)
{
    this.frame ++;

    // Track FPS
    if (time != null && this.last_time != null) {
        this.elapsed += time - this.last_time;

        // Reset FPS timer every N frames
        if (this.frame % this.fps_sample_range == 0) {
            this.elapsed = 0;
        }

    }
    this.last_time = time;
};

Display.prototype.FPS = function FPS ()
{
    return Math.round(1000 / (this.elapsed / (this.frame % this.fps_sample_range)));
};

Display.prototype.timePerFrame = function timePerFrame ()
{
    return (this.frame_time / this.frame);
};

Display.prototype.startFrameTimer = function startFrameTimer ()
{
    this.start_frame_time = new Date();
};

Display.prototype.endFrameTimer = function endFrameTimer ()
{
    this.frame_time += (new Date()) - this.start_frame_time;
};

/*** Class methods ***/

Display.rgba = function rgba (r, g, b, a)
{
    return (r | (g << 8) | (b << 16) | ((a || 255) << 24));
};

// Modify the RGB components (lower 24 bits) and leave the alpha component (top 8 bits) alone
Display.setRGB = function setAlpha (p, rgb)
{
    return ((rgb & (~(255 << 24))) | (p & (255 << 24)));
};

// Modify the alpha component (top 8 bits) and leave the RGB in the lower 24 bits alone
Display.setAlpha = function setAlpha (p, a)
{
    return ((p & (~(255 << 24))) | (a << 24));
};

// Load an image from URL
Display.loadImage = function loadImage (url, callback)
{
    var img = new Image();
    img.onload = function loadImageOnload () {
        callback(img);
    };
    img.src = url;
};

// Returns an ImageData object, given an Image object (via rendering on a canvas)
Display.dataFromImage = function dataFromImage (img)
{
    var canvas, context, image_data;

    if (img == null) {
        return false;
    }

    canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    context = canvas.getContext('2d');
    context.drawImage(img, 0, 0, img.width, img.height);
    image_data = context.getImageData(0, 0, img.width, img.height);

    return image_data;
};

// Make a palette from gradients
Display.makePaletteForGradients = function makePaletteForGradients (colors, bands)
{
    var palette;
    var maxp = null;

    bands.forEach(function (band) {
      if (maxp == null || band[1] > maxp) {
        maxp = band[1];
      }
    });

    palette = new Uint32Array(maxp);

    bands.forEach(function (band) {
      var p, b1, b2, c1, c2;

      b1 = band[0];
      b2 = band[1];
      c1 = colors[band[2]];
      c2 = colors[band[3]];

      for (p = b1; p < b1 + b2; p++) {
        palette[p] =
          (((c2[0] - c1[0]) * (p - b1) / (b2 - b1)) + c1[0]) |
          ((((c2[1] - c1[1]) * (p - b1) / (b2 - b1)) + c1[1]) << 8) |
          ((((c2[2] - c1[2]) * (p - b1) / (b2 - b1)) + c1[2]) << 16) |
          (255 << 24);
      }
    });

    return palette;
};

// Cross-browser compatibility for requestAnimationFrame
Display.requestAnimationFrameCompatibility = function requestAnimationFrameCompatibility ()
{
  if (window.requestAnimationFrame == undefined) {
      window.requestAnimationFrame =
          (function () {
              return (
                  window.requestAnimationFrame       ||
                  window.webkitRequestAnimationFrame ||
                  window.mozRequestAnimationFrame    ||
                  window.oRequestAnimationFrame      ||
                  window.msRequestAnimationFrame     ||
                  function (callback) {
                      window.setTimeout(callback, 1000 / 60);
                  }
              );
          })();
  }
};
