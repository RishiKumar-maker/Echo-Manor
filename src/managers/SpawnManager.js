import { SpawnPoint } from '../world/SpawnPoint.js';

/**
 * @typedef {object} SpawnData
 * @property {THREE.Vector3} position - Cloned spawn position.
 * @property {THREE.Euler} rotation - Cloned spawn rotation.
 */

/**
 * Owns and provides player spawn locations, identified by string id.
 * Built on top of SpawnPoint, which already clones on the way in and
 * clones again on the way out — so nothing external can mutate a
 * SpawnManager's stored data through any value it accepted or returned.
 *
 * SpawnManager only stores and retrieves spawn data. It doesn't
 * decide which spawn to use, doesn't move the player, and doesn't
 * know about BootScene, GameManager, or FirstPersonController.
 */
export class SpawnManager {
  constructor() {
    /**
     * Registered spawn points, keyed by id.
     * @private @type {Map<string, SpawnPoint>}
     */
    this._spawns = new Map();
  }

  /**
   * Prepares the spawn manager. Currently a no-op beyond what the
   * constructor already sets up — present so SpawnManager follows
   * the same initialize()/dispose() lifecycle used elsewhere in the
   * engine.
   */
  initialize() {}

  /**
   * Clears every registered spawn point. Safe to call even if
   * initialize() was never called.
   */
  dispose() {
    this.clear();
  }

  /**
   * Registers a spawn point under the given id. Position and
   * rotation are cloned internally (via SpawnPoint's constructor) —
   * the objects passed in are not stored by reference. Registering
   * under an id that's already in use replaces the previous spawn
   * at that id.
   * @param {string} id - Unique identifier for this spawn point.
   * @param {THREE.Vector3} position - Spawn position.
   * @param {THREE.Euler} rotation - Spawn rotation.
   */
  registerSpawn(id, position, rotation) {
    this._spawns.set(id, new SpawnPoint(position, rotation));
  }

  /**
   * Removes a registered spawn point. No-op if the id isn't registered.
   * @param {string} id - Identifier of the spawn point to remove.
   */
  removeSpawn(id) {
    this._spawns.delete(id);
  }

  /**
   * Retrieves a spawn point's position and rotation, both cloned so
   * the caller can't mutate SpawnManager's stored data through the
   * returned values. Logs a warning and returns null if the id isn't
   * registered.
   * @param {string} id - Identifier of the spawn point to retrieve.
   * @returns {SpawnData|null}
   */
  getSpawn(id) {
    const spawn = this._spawns.get(id);

    if (!spawn) {
      console.warn(`SpawnManager: no spawn registered under id "${id}".`);
      return null;
    }

    return {
      position: spawn.getPosition(),
      rotation: spawn.getRotation(),
    };
  }

  /**
   * Checks whether a spawn point is registered under the given id.
   * @param {string} id - Identifier to check.
   * @returns {boolean}
   */
  hasSpawn(id) {
    return this._spawns.has(id);
  }

  /**
   * Removes every registered spawn point.
   */
  clear() {
    this._spawns.clear();
  }
}
