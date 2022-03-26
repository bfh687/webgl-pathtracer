const compile = (engine, gl) => {
  // set clear color of webgl, params: (r, g, b, a)
  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  // clear
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // create vertex and fragment shader
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);

  // set shader source (shader to assign to, source code to assign)
  gl.shaderSource(vertex, vert);
  gl.shaderSource(fragment, frag);

  // compile shaders
  gl.compileShader(vertex);
  gl.compileShader(fragment);

  // check for shader compilation errors
  if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
    console.error("error compiling vertex shader", gl.getShaderInfoLog(vertex));
    return;
  }
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
    console.error("error compiling fragment shader", gl.getShaderInfoLog(fragment));
    return;
  }

  // create program and combine shaders, then link program
  engine.program = gl.createProgram();
  gl.attachShader(engine.program, vertex);
  gl.attachShader(engine.program, fragment);
  gl.linkProgram(engine.program);

  // check for linker errors
  if (!gl.getProgramParameter(engine.program, gl.LINK_STATUS)) {
    console.error("error linking program", gl.getProgramInfoLog(engine.program));
    return;
  }

  // validate program; remove from final builds
  gl.validateProgram(engine.program);
  if (!gl.getProgramParameter(engine.program, gl.VALIDATE_STATUS)) {
    console.error("error validating program", gl.getProgramInfoLog(fragment));
    return;
  }

  // attribute location(s)
  engine.pos_attr_location = gl.getAttribLocation(engine.program, "a_position");

  // uniform location(s)
  engine.res_location = gl.getUniformLocation(engine.program, "resolution");
  engine.time_location = gl.getUniformLocation(engine.program, "time");
  engine.frame_location = gl.getUniformLocation(engine.program, "frame");

  // handle position buffer
  engine.pos_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, engine.pos_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  // / / / / / P I N G  P O N G  T E C H N I Q U E / / / / / //

  // texture location(s)

  // set active program
  gl.useProgram(engine.program);
};

const render = (engine, gl) => {
  // set viewport size
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // set active program
  gl.useProgram(engine.program);

  // bind position buffer
  gl.enableVertexAttribArray(engine.pos_attr_location);
  gl.bindBuffer(gl.ARRAY_BUFFER, engine.pos_buffer);
  gl.vertexAttribPointer(engine.pos_attr_location, 2, gl.FLOAT, false, 0, 0);

  // set uniform values
  gl.uniform2f(engine.res_location, gl.canvas.width, gl.canvas.height);
  gl.uniform1f(engine.time_location, engine.timer.time);
  gl.uniform1i(engine.frame_location, engine.timer.frame);

  // set texture uniform
  // gl.uniform1i(engine.texture_location, engine.texture_state);

  // draw to display
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // swap buffers
  //engine.texture_state = (engine.texture_state + 1) % 2;
};

const create_texture = (gl) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
};
