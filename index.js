// create canvas and webgl context
const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

// create and start engine
const engine = new Engine(gl);
engine.start();
