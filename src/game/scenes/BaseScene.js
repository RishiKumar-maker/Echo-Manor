/**
 * Defines the standard lifecycle every scene implements:
 * initialize(), update(delta), dispose(). Scenes extend this
 * and override whichever hooks they actually need — the base
 * implementations are no-ops so a subclass only needs to
 * define what's different for it.
 */
export class BaseScene {
  /**
   * Builds the scene's content.
   * @returns {Promise<void>}
   */
  async initialize() {}

  /**
   * Per-frame update hook.
   * @param {number} delta - Time in seconds since the last frame.
   */
  update(delta) {}

  /**
   * Removes the scene's content and frees its resources.
   */
  dispose() {}
}
