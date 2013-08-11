"use strict";

/***** Point *****/

function Point (x, y)
{
	return { 
		x: x, 
		y: y
	};
}

Point.copy = function (p)
{
    if (p == null) {
        return null;
    }
	return { x: p.x, y: p.y };
};

Point.equals = function (first, second)
{
    if (first == null || second == null) {
        return false;
    }
    return (first.x == second.x && first.y == second.y);
};

Point.rotate = function (p, theta)
{
	return Point(
		p.x * Math.cos(theta * Math.PI / 180) + p.y * -Math.sin(theta * Math.PI / 180),
		p.x * Math.sin(theta * Math.PI / 180) + p.y * Math.cos(theta * Math.PI / 180)
	);
};

Point.print = function (p)
{
    if (p == null) {
        return null;
    }
    return "(" + p.x + ", " + p.y + ")";
};
