export default class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    return { x, y };
  }

  static copy(p: Point): Point {
    if (p == null) {
      return null;
    }
    return { x: p.x, y: p.y };
  }

  static equals(first: Point, second: Point): boolean {
    if (first == null || second == null) {
      return false;
    }
    return (first.x == second.x && first.y == second.y);
  }

  static rotate(p: Point, theta: number): Point {
    return new Point(
      p.x * Math.cos(theta * Math.PI / 180) + p.y * -Math.sin(theta * Math.PI / 180),
      p.x * Math.sin(theta * Math.PI / 180) + p.y * Math.cos(theta * Math.PI / 180)
    );
  }

  static print(p: Point): string {
    if (p == null) {
      return null;
    }
    return "(" + p.x + ", " + p.y + ")";
  }

}
