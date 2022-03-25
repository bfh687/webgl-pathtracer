// create canvas and webgl context
const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

// create and start engine
const engine = new Engine(gl);
engine.start();

// log shader version
console.log("WebGL version: " + gl.getParameter(gl.VERSION));
console.log("GLSL version: " + gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
