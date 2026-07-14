import * as THREE from 'three';

/**
 * Owns the transform hierarchy for the player's viewpoint: a pivot
 * Object3D (the rig) with the game's existing PerspectiveCamera
 * attached as its child. This establishes the attachment point that
 * future first-person systems (mouse look, head-bob, camera shake,
 * etc.) will build on top of.
 *
 * CameraRig does not itself rotate or move the rig, read input, or
 * know anything about movement — its only responsibility is the
 * rig/camera parent-child relationship.
 */
export class CameraRig {
  /**
   * @param {THREE.PerspectiveCamera} camera - The existing camera to attach to the rig.
   */
  constructor(camera) {
    /** @private */
    this._camera = camera;

    /**
     * The pivot Object3D that acts as the camera's parent. Future
     * systems transform this to move/orient the viewpoint — the
     * camera itself is never transformed directly once attached.
     * @private @type {THREE.Object3D}
     */
    this._rig = new THREE.Object3D();
    this._rig.name = 'CameraRig';
  }

  /**
   * Attaches the camera to the rig. Sets no position or rotation on
   * either — establishing the hierarchy is this class's only job.
   */
  initialize() {
    this._rig.add(this._camera);
  }

  /**
   * Per-frame update hook. Intentionally empty — the rig has no
   * behavior of its own at this stage; this exists only so CameraRig
   * can be driven with the same lifecycle as every other system.
   * @param {number} delta - Time in seconds since the last frame.
   */
  update(delta) {}

  /**
   * Detaches the camera from the rig, restoring it to no parent.
   */
  dispose() {
    this._rig.remove(this._camera);
  }

  /**
   * Returns the rig's pivot Object3D.
   * @returns {THREE.Object3D}
   */
  getObject() {
    return this._rig;
  }

  /**
   * Returns the camera attached to this rig.
   * @returns {THREE.PerspectiveCamera}
   */
  getCamera() {
    return this._camera;
  }
}
