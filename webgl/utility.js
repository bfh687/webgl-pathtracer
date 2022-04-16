const init = (engine, gl) => {
  if (!gl) return;

  engine.scene = new Object();
  engine.uniforms = new Object();

  // compile and link shaders
  engine.tracer_program = init_program(gl, tracer_vert, tracer_frag);
  engine.render_program = init_program(gl, render_vert, render_frag);

  // create framebuffer and textures
  const type = gl.getExtension("OES_texture_float") ? gl.FLOAT : gl.UNSIGNED_BYTE;
  engine.scene.framebuffer = gl.createFramebuffer();

  engine.scene.textures = [];
  for (var i = 0; i < 2; i++) {
    engine.scene.textures.push(gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D, engine.scene.textures[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 512, 512, 0, gl.RGB, type, null);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);

  // init frame count
  engine.scene.frame_count = 0;
};

function update(engine, gl) {
  if (engine.scene.frame_count > 500) return;

  // update engine.uniforms
  engine.uniforms.texture_weight = 1.0 / (engine.scene.frame_count + 1.0);
  engine.uniforms.frame = engine.scene.frame_count;

  // set program and bind textures
  gl.useProgram(engine.tracer_program);
  gl.bindTexture(gl.TEXTURE_2D, engine.scene.textures[0]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, engine.scene.framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, engine.scene.textures[1], 0);

  // set engine.uniforms
  set_uniforms(gl, engine.tracer_program, engine.uniforms);

  const offset = 0;
  const vertex_count = 6;
  gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertex_count);

  // ping-pong
  engine.scene.textures.reverse();
}

function render(engine, gl) {
  // set program, bind textures, and set up screen space
  gl.useProgram(engine.render_program);
  gl.bindTexture(gl.TEXTURE_2D, engine.scene.textures[0]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  set_render_buffer(gl, engine.render_program);

  const offset = 0;
  const vertex_count = 6;

  // draw to screen space
  gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertex_count);
  engine.scene.frame_count++;
}

function set_uniforms(gl, program, data) {
  for (var name in data) {
    var value = data[name];
    var location = gl.getUniformLocation(program, name);

    if (location == null) continue;

    if (typeof value == "number") {
      gl.uniform1f(location, value);
    } else if (value instanceof Array) {
      if (value.length % 3 == 0) gl.uniform3fv(location, value);
      else if (value.length % 4 == 0) gl.uniform4fv(location, value);
      else gl.uniform1fv(location, value);
    } else if (value instanceof Float32Array) {
      if (value.length == 3) gl.uniform3fv(location, value);
      else if (value.length == 4) gl.uniform4fv(location, value);
    }
  }
}

function set_render_buffer(gl, shaderProgram) {
  vertex_pos = gl.getAttribLocation(shaderProgram, "vertex");

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  const vertexes = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexes), gl.STATIC_DRAW);

  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = gl.FALSE;
    const stride = 0;
    const offset = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertex_pos, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(vertex_pos);
  }
}

function init_program(gl, vsSource, fsSource) {
  const vertexShader = load_shader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = load_shader(gl, gl.FRAGMENT_SHADER, fsSource);

  // create shader program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("unable to initialize the shader program: " + gl.getProgramInfoLog(program));
    return null;
  }

  gl.validateProgram(program);
  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
    console.error("error validating program", gl.getProgramInfoLog(fragmentShader));
    return;
  }

  return program;
}

function load_shader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("error compiling " + type + " shader", gl.getShaderInfoLog(shader));
    return;
  }

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
