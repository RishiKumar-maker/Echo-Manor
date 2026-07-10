import { GameManager } from '../managers/GameManager.js';

/**
 * Owns the gameplay lifecycle. Delegates creation of every
 * subsystem to the GameManager and starts/stops it. Game is
 * no longer the highest-level object — it is owned and
 * bootstrapped by Application.
 */
export class Game {
  constructor() {
    /** @type {GameManager} */
    this.gameManager = new GameManager();
  }

  /**
   * Starts the engine.
   */
  start() {
    this.gameManager.init();
  }

  /**
   * Stops the engine.
   */
  stop() {
    this.gameManager.stop();
  }
}
