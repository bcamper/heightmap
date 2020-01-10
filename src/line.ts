import Point from './point';

// export class Line {
// 	start: Point;
// 	end: Point;

// 	constructor(start, end) {
// 		this.start = start;
// 		this.end = end;
// 	}
// }

interface Line {
  start: Point;
  end: Point;
}

export interface PropertyValueDictionary {
  [index: string]: number;
}

export interface PropertyRangeDictionary {
  [index: string]: [number, number];
}

export default class LineTracer {
  position: Point;
  properties: PropertyValueDictionary;

  private line: Line;
  private delta: Point;
  private step: Point;
  private accumulator: number;
  private propertyDeltas: PropertyValueDictionary;

  constructor(line: Line, properties: PropertyRangeDictionary = {}) {
    this.line = line;

    // Forces integers / whole pixels
    this.line.start.x = Math.round(this.line.start.x);
    this.line.start.y = Math.round(this.line.start.y);

    this.line.end.x = Math.round(this.line.end.x);
    this.line.end.y = Math.round(this.line.end.y);

    this.position = Point.copy(this.line.start);

    // Bresenham-style line iterator
    this.delta = new Point(
      Math.abs(this.line.end.x - this.line.start.x),
      Math.abs(this.line.end.y - this.line.start.y)
    );

    this.step = new Point(
      (this.line.start.x < this.line.end.x) ? 1 : -1,
      (this.line.start.y < this.line.end.y) ? 1 : -1
    );

    this.accumulator = (this.delta.x >= this.delta.y) ? (this.delta.x / 2) : (this.delta.y / 2);

    // Optionally interpolate between additionally provided named property ranges, passed in the form of:
    // properties = { key1: [from, to], key2: [from, to], ... }
    if (Object.keys(properties).length > 0) {
      this.properties = {};
      this.propertyDeltas = {};

      for (const k in properties) {
        this.properties[k] = properties[k][0];
        this.propertyDeltas[k] = (properties[k][1] - properties[k][0]);
        if (this.delta.x >= this.delta.y) {
          this.propertyDeltas[k] /= this.delta.x;
        }
        else {
          this.propertyDeltas[k] /= this.delta.y;
        }
      }
    }
  }

  next() {
    if (this.position == null) {
      return;
    }
    else if (Point.equals(this.position, this.line.end)) {
      this.position = null;
      return;
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
      for (const k in this.properties) {
        this.properties[k] += this.propertyDeltas[k];
      }
    }
  }

}
