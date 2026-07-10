import { Game } from '../game/Game.js';

/**
 * True top-level object for Echo Manor. Owns application
 * startup and shutdown, decides where the renderer's canvas
 * is attached in the DOM, and drives the single window-resize
 * listener that Renderer and Camera respond to. Also the future
 * home for loading-screen and debug-tooling bootstrapping.
 */
export class Application {
  constructor() {
    /** @type {Game} */
    this.game = new Game();

    this._onResize = this._onResize.bind(this);
  }

  /**
   * Starts the application: attaches the renderer's canvas to
   * the document, performs an initial resize, subscribes to
   * window resize, and starts the game.
   */
  start() {
    const { renderer } = this.game.gameManager;
    document.body.appendChild(renderer.domElement);

    this._onResize();
    window.addEventListener('resize', this._onResize);

    this.game.start();
  }

  /**
   * Shuts the application down: stops the game and removes
   * the window resize listener.
   */
  stop() {
    window.removeEventListener('resize', this._onResize);
    this.game.stop();
  }

  /**
   * Resizes the renderer and camera to match the current window size.
   * @private
   */
  _onResize() {
    const { renderer, camera } = this.game.gameManager;
    renderer.resize(window.innerWidth, window.innerHeight);
    camera.resize(window.innerWidth, window.innerHeight);
  }
}
