import * as THREE from 'three';

/**
 * Stores a single spawn location — a position and rotation — so
 * spawn data has one reusable, dedicated home instead of being
 * hardcoded inline inside BootScene or FirstPersonController.
 *
 * SpawnPoint never exposes its internal Vector3/Euler by reference.
 * The constructor copies its inputs rather than storing them, and
 * every accessor returns a new, independent clone — so neither the
 * caller who constructed a SpawnPoint nor anything reading from it
 * later can accidentally mutate its stored data.
 */
export class SpawnPoint {
  /**
   * @param {THREE.Vector3} position - The spawn position. Copied internally — the passed-in object is not stored by reference.
   * @param {THREE.Euler} rotation - The spawn rotation. Copied internally — the passed-in object is not stored by reference.
   */
  constructor(position, rotation) {
    /** @private @type {THREE.Vector3} */
    this._position = new THREE.Vector3().copy(position);

    /** @private @type {THREE.Euler} */
    this._rotation = new THREE.Euler().copy(rotation);
  }

  /**
   * Returns a clone of the spawn position. Mutating the returned
   * Vector3 has no effect on this SpawnPoint's stored data.
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this._position.clone();
  }

  /**
   * Returns a clone of the spawn rotation. Mutating the returned
   * Euler has no effect on this SpawnPoint's stored data.
   * @returns {THREE.Euler}
   */
  getRotation() {
    return this._rotation.clone();
  }

  /**
   * Explicitly returns a clone of the spawn position. Behaves
   * identically to getPosition() — provided as a clearly-named
   * alternative for call sites where making the cloning guarantee
   * obvious matters more than brevity.
   * @returns {THREE.Vector3}
   */
  clonePosition() {
    return this._position.clone();
  }

  /**
   * Explicitly returns a clone of the spawn rotation. Behaves
   * identically to getRotation() — provided as a clearly-named
   * alternative for call sites where making the cloning guarantee
   * obvious matters more than brevity.
   * @returns {THREE.Euler}
   */
  cloneRotation() {
    return this._rotation.clone();
  }
}
