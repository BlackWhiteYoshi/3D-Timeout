# Timeout

[*3D-Timeout* page](https://blackwhiteyoshi.github.io/3D-Timeout/site.html)

This is just a side project to learn and test the WebGPU API.


## Description

This application is a single html-page that displays a Timer in 3D counting towards 0.

You can set the timer and it will keep track of the elapsed time even if the application is closed.
The timer and some other configurations can be set in the options menu.
The options menu can be opened by clicking the button top left.

You can move around freely using mouse and keyboard.
The controls are similar to minecraft creative mode.
The options menu also displays these controls.

The background sphere as well as the sphere and cubes behind the timer are just aesthetic and have no purpose.


## Source Code - Architecture

The architecture of this project is quite bad.
Normally you should have a ResourceManager / DependencyContainer to manage your objects.
Since this is a small test project I decided to skip these things.  
Furthermore the boundary between *Renderer.ts* and *Logic.ts* is bad.
Since *Logic.ts* represents something like a scene, the rendering functions as well as building/choosing the renderpipeline should be included in *Logic.ts*.
But to properly set this up, a ResourceManager is required.


## LICENSE

The files in this repository are licensed under the MIT License, except for the file `rose.svg` (*wwwroot/img/rose.svg*).
The file `rose.svg` is **not** licensed under the MIT License. It is proprietary and all rights are reserved.

See the `LICENSE` file for more details.
