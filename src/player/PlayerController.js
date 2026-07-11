import * as THREE from 'three';

/** Default spawn position for the local player, in world units. */
const DEFAULT_POSITION = { x: 0, y: 0, z: 0 };

/** Default orientation for the local player, in radians. */
const DEFAULT_ROTATION = { x: 0, y: 0, z: 0 };

/**
 * Represents the local player. At this stage PlayerController only
 * owns player state — position, rotation, velocity — and the
 * initialize()/update()/dispose() lifecycle that future systems will
 * build on. It is the intended future owner of movement, collision,
 * interaction, and camera-follow behavior, but implements none of
 * that yet: update() is intentionally empty, establishing only the
 * ownership structure and lifecycle hook those systems will use.
 *
 * PlayerController knows nothing about puzzles, networking, or UI —
 * it exposes plain state and lets other systems read/drive it.
 */
export class PlayerController {
  constructor() {
    /**
     * The player's world position. Created once here and mutated in
     * place by future systems — never reassigned to a new instance.
     * @type {THREE.Vector3}
     */
    this.position = new THREE.Vector3(
      DEFAULT_POSITION.x,
      DEFAULT_POSITION.y,
      DEFAULT_POSITION.z
    );

    /**
     * The player's orientation. Created once here and mutated in
     * place by future systems — never reassigned to a new instance.
     * @type {THREE.Euler}
     */
    this.rotation = new THREE.Euler(
      DEFAULT_ROTATION.x,
      DEFAULT_ROTATION.y,
      DEFAULT_ROTATION.z
    );

    /**
     * The player's current velocity. Created once here and mutated
     * in place by the future movement system — never reassigned.
     * @type {THREE.Vector3}
     */
    this.velocity = new THREE.Vector3(0, 0, 0);
  }

  /**
   * Prepares the player controller. Intentionally empty for now —
   * establishes the lifecycle hook that future movement, collision,
   * interaction, and camera-follow systems will initialize into.
   */
  initialize() {}

  /**
   * Per-frame update hook. Intentionally contains no gameplay logic
   * yet — its purpose at this stage is only to establish the
   * lifecycle and ownership structure that future movement,
   * collision, and interaction systems will build on.
   * @param {number} delta - Time in seconds since the last frame.
   */
  update(delta) {}

  /**
   * Tears down the player controller. Intentionally empty for now —
   * establishes the lifecycle hook future systems will clean up into.
   */
  dispose() {}

  /**
   * Returns the player's current world position. The returned
   * Vector3 is the live internal instance, not a copy — mutating it
   * mutates the player's actual position.
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.position;
  }

  /**
   * Sets the player's world position by copying the given values
   * into the existing Vector3 instance, rather than replacing it.
   * @param {{x: number, y: number, z: number}} position
   */
  setPosition(position) {
    this.position.set(position.x, position.y, position.z);
  }

  /**
   * Returns the player's current rotation. The returned Euler is the
   * live internal instance, not a copy — mutating it mutates the
   * player's actual rotation.
   * @returns {THREE.Euler}
   */
  getRotation() {
    return this.rotation;
  }

  /**
   * Sets the player's rotation by copying the given values into the
   * existing Euler instance, rather than replacing it.
   * @param {{x: number, y: number, z: number}} rotation
   */
  setRotation(rotation) {
    this.rotation.set(rotation.x, rotation.y, rotation.z);
  }
}
