/**
 * Drives the main animation loop via requestAnimationFrame.
 * Contains no rendering or gameplay logic itself — it only
 * measures delta time and invokes a supplied callback once
 * per frame.
 */
export class GameLoop {
  /**
   * @param {(deltaTime: number) => void} onTick - Called once per frame with delta time in seconds.
   */
  constructor(onTick) {
    /** @private */
    this._onTick = onTick;

    /** @private */
    this._isRunning = false;

    /** @private */
    this._lastTime = 0;

    /** @private */
    this._frameId = null;

    this._loop = this._loop.bind(this);
  }

  /**
   * Starts the loop.
   */
  start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this._lastTime = performance.now();
    this._frameId = requestAnimationFrame(this._loop);
  }

  /**
   * Stops the loop.
   */
  stop() {
    this._isRunning = false;
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  /**
   * Internal per-frame handler.
   * @param {number} now - Current time in milliseconds.
   * @private
   */
  _loop(now) {
    if (!this._isRunning) return;

    const deltaTime = (now - this._lastTime) / 1000;
    this._lastTime = now;

    this._onTick(deltaTime);

    this._frameId = requestAnimationFrame(this._loop);
  }
}
