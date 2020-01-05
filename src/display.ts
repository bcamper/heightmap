import Point from './point';

interface ColorDictionary {
  [index: string]: [number, number, number, number?];
}

export default class Display {
  width: number;
  height: number;
  pixelRatio: number;
  origin: Point;

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: ImageData;
  pixels: Uint32Array;
  background: Uint32Array;

  frame: number;
  elapsed: number;
  lastTime: number;
  startFrameTime: number;
  frameTime: number;
  fpsSampleRange: number;

  constructor(width: number, height: number, canvas: HTMLCanvasElement, options: any = {}) {
    this.frame = 0;
    this.elapsed = 0;
    this.lastTime = 0;
    this.fpsSampleRange = options.fpsSampleRange || 200;
    this.startFrameTime = 0;
    this.frameTime = 0;

    this.pixelRatio = options.pixelRatio || 1;
    this.width = width * this.pixelRatio;
    this.height = height * this.pixelRatio;

    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`;

    this.origin = { x: this.width / 2, y: this.height / 2 };

    this.ctx = this.canvas.getContext('2d');
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
    this.background = new Uint32Array(this.pixels.length);
    this.background.set(this.pixels);
  }

  clearScreen() {
    this.pixels.set(this.background);
  }

  blitScreen() {
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  advanceFrame(time: number) {
    this.frame++;

    // Track FPS
    if (time != null && this.lastTime != null) {
      this.elapsed += time - this.lastTime;

      // Reset FPS timer every N frames
      if (this.frame % this.fpsSampleRange == 0) {
        this.elapsed = 0;
      }
    }
    this.lastTime = time;
  }

  fps() {
    return Math.round(1000 / (this.elapsed / (this.frame % this.fpsSampleRange)));
  }

  timePerFrame() {
    return (this.frameTime / this.frame);
  }

  startFrameTimer() {
    this.startFrameTime = +new Date();
  }

  endFrameTimer() {
    this.frameTime += (+new Date()) - this.startFrameTime;
  }

  /*** Class methods ***/

  static rgba(r: number, g: number, b: number, a: number = null): number {
    return (r | (g << 8) | (b << 16) | ((a || 255) << 24));
  }

  // Modify the RGB components (lower 24 bits) and leave the alpha component (top 8 bits) alone
  static setRGB(p: number, rgb: number): number {
    return ((rgb & (~(255 << 24))) | (p & (255 << 24)));
  }

  // Modify the alpha component (top 8 bits) and leave the RGB in the lower 24 bits alone
  static setAlpha(p: number, a: number): number {
    return ((p & (~(255 << 24))) | (a << 24));
  }

  // Load an image from URL
  static async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = url;
    });
  }

  // Returns an ImageData object, given an Image object (via rendering on a canvas)
  static dataFromImage(img: HTMLImageElement): ImageData|null {
    if (img == null) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    return imageData;
  }

  // Make a palette from gradients
  static makePaletteForGradients(colors: ColorDictionary, bands: Array<[number, number, string, string]>): Uint32Array {
    let maxp:number = null;
    bands.forEach(function (band) {
      if (maxp == null || band[1] > maxp) {
        maxp = band[1];
      }
    });

    const palette = new Uint32Array(maxp);

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
  }

}
