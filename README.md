heightmap
=========

A heightmap software rendering demo on HTML canvas.

Demo: http://vector.io/heightmap/

This is a software renderer (direct pixel rendering, no WebGL, etc.) of a terrain heightmap, bearing some resemblance to the 90s-era demoscene and DOS games like Magic Carpet. 
It works by mapping a 2D image onto a polygon, then treating the intensity values of the image as heights that are extruded up from the polygon's surface.

Why? I've always enjoyed low-level pixel rendering for the challenge and the unique look... and there's just something magic feeling about your code being responsible for every little pixel.
Though the demo shows a heightmap, there's also some code in here for various steps along the way: rendering wireframes, gradient/Gouraud-style shading, and texture mapping.
You could probably do this much more efficiently and higher resolution with a pixel shader or mesh in WebGL, 
but I wanted to see if I remembered how to do this from scratch, and to see how feasible this type of rendering is on the ```<canvas>``` element with today's javascript engines (it's pretty good, you can get 60fps for many effects). 
It turns out that optimizing pixel rendering in JS today is as idiosyncratic, opaque, and implementation-specific as for VGA-era PCs! 
This kind of project is good for profiling since the inner rendering code is executed many thousands of time per second and small variations can have a big impact on FPS. 
The single biggest performance element I found was to use **typed arrays** whenever possible.

(Sample heightmap image taken from the [Wikipedia page on heightmaps](http://en.wikipedia.org/wiki/Heightmap).)
