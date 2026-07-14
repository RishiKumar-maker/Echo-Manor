import * as THREE from 'three';

/** Walking movement speed, in  world units per second. */
const WALK_SPEED = 3;

/** Sprinting movement speed, in world units per second. */
const SPRINT_SPEED = 6;

/** KeyboardEvent.code values this controller reads. */
const MOVEMENT_KEYS = {
  FORWARD: 'KeyW',
  BACKWARD: 'KeyS',
  LEFT: 'KeyA',
  RIGHT: 'KeyD',
  SPRINT: 'ShiftLeft',
};

/**
 * Translates keyboard input into PlayerController movement. Supports
 * simple walking and sprinting along the ground plane, relative to
 * the player's current yaw — no gravity, collision, jumping,
 * interaction, or networking at this stage. Movement is entirely
 * delta-time based, so speed stays consistent regardless of frame rate.
 *
 * MovementController reads input from InputManager and writes
 * directly into PlayerController's existing position Vector3. It
 * never rotates the camera, never reads mouse input, and knows
 * nothing about the Three.js Scene.
 */
export class MovementController {
  /**
   * @param {import('./PlayerController.js').PlayerController} playerController - Owns the position this controller moves and the rotation movement is relative to.
   * @param {import('../input/InputManager.js').InputManager} inputManager - Source of keyboard state.
   */
  constructor(playerController, inputManager) {
    /** @private */
    this._playerController = playerController;

    /** @private */
    this._inputManager = inputManager;

    /**
     * Local-space input direction for the current frame (x = strafe,
     * z = forward/back), reused every frame instead of being
     * reallocated.
     * @private @type {THREE.Vector3}
     */
    this._inputDirection = new THREE.Vector3();

    /**
     * World-space displacement for the current frame, reused every
     * frame instead of being reallocated.
     * @private @type {THREE.Vector3}
     */
    this._movement = new THREE.Vector3();

    /**
     * World up axis, used to rotate the local input direction by the
     * player's yaw. Created once and reused every frame.
     * @private @type {THREE.Vector3}
     */
    this._upAxis = new THREE.Vector3(0, 1, 0);
  }

  /**
   * Prepares the movement controller. Currently a no-op — reserved
   * so the lifecycle is already in place if future setup is needed.
   */
  initialize() {}

  /**
   * Reads the current frame's WASD/sprint input and moves the player
   * accordingly. Frame-rate independent: displacement is always
   * speed × delta, so movement speed doesn't change with frame rate.
   * @param {number} delta - Time in seconds since the last frame.
   */
  update(delta) {
    this._readInputDirection();

    if (this._inputDirection.lengthSq() === 0) {
      return;
    }

    this._inputDirection.normalize();

    const speed = this._inputManager.isKeyDown(MOVEMENT_KEYS.SPRINT)
      ? SPRINT_SPEED
      : WALK_SPEED;

    this._movement
      .copy(this._inputDirection)
      .applyAxisAngle(this._upAxis, this._playerController.rotation.y)
      .multiplyScalar(speed * delta);

    this._playerController.position.add(this._movement);
  }

  /**
   * Releases this controller's references to its collaborators.
   * Does not dispose InputManager or PlayerController themselves —
   * they're owned and cleaned up elsewhere.
   */
  dispose() {
    this._playerController = null;
    this._inputManager = null;
  }

  /**
   * Reads WASD state from InputManager into the reused local-space
   * input direction vector. Left un-normalized and un-rotated here —
   * update() finishes both steps only if there's actual input.
   * @private
   */
  _readInputDirection() {
    const forward = this._inputManager.isKeyDown(MOVEMENT_KEYS.FORWARD);
    const backward = this._inputManager.isKeyDown(MOVEMENT_KEYS.BACKWARD);
    const left = this._inputManager.isKeyDown(MOVEMENT_KEYS.LEFT);
    const right = this._inputManager.isKeyDown(MOVEMENT_KEYS.RIGHT);

    const strafe = Number(right) - Number(left);
    const forwardBack = Number(backward) - Number(forward);

    this._inputDirection.set(strafe, 0, forwardBack);
  }
}
