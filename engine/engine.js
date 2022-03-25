class Engine {
  constructor(gl) {
    // compile shader
    compile(this, gl);
    this.gl = gl;

    // initialize timer
    this.timer = new Timer();

    // input information
    this.click = false;
    this.keys = {};

    this.running = false;

    // html options
    this.options = {
      prevent: {
        contextMenu: true,
        scrolling: true,
      },
      debugging: false,
    };
  }

  start() {
    const game_loop = () => {
      this.loop();
      requestAnimationFrame(game_loop);
    };
    game_loop();
  }

  loop() {
    this.clock_tick = this.timer.tick();
    render(this, gl);
  }

  width() {
    return this.gl?.canvas?.width || 0;
  }

  height() {
    return this.gl?.canvas?.height || 0;
  }
}
