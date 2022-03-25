class Timer {
  constructor() {
    this.time = 0;
    this.max_step = 0.05;
    this.last_timestamp = 0;
  }

  tick() {
    const current = Date.now();
    const delta = (current - this.last_timestamp) / 1000;
    this.last_timestamp = current;

    const game_delta = Math.min(delta, this.max_step);
    this.time += game_delta;

    return game_delta;
  }

  reset() {
    this.time = 0;
  }
}
