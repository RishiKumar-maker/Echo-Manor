import * as THREE from 'three';

/** Walking speed, in wo rld units per second. */
const WALK_SPEED = 3;

/** Sprinting speed, in world units per second. */
const SPRINT_SPEED = 6;

/** Mouse-look sensitivity: radians of rotation per pixel of mouse movement. */
const MOUSE_SENSITIVITY = 0.002;

/** Clamp on vertical look angle so the camera can't flip past straight up/down. */
const MAX_PITCH = Math.PI / 2 - 0.01;

/** KeyboardEvent.code values this controller reads. */
const MOVEMENT_KEYS = {
  FORWARD: 'KeyW',
  BACKWARD: 'KeyS',
  LEFT: 'KeyA',
  RIGHT: 'KeyD',
  SPRINT: 'ShiftLeft',
};

/** DOM event used to request Pointer Lock when the canvas is clicked. */
const CLICK_EVENT = 'click';

/** SpawnManager id for the player's initial spawn point. */
const ARRIVAL_SPAWN_ID = 'arrival';

/**
 * The first playable first-person controller: lets the player walk
 * around BootScene with WASD (with sprint) and look around with the
 * mouse while Pointer Lock is active. It manipulates the existing
 * camera directly — no new camera is created, and nothing about the
 * engine's existing camera setup is touched otherwise.
 *
 * On initialize(), if SpawnManager has an "arrival" spawn point
 * registered, the camera is placed there; otherwise it's left at
 * whatever position/rotation the active scene already set up.
 *
 * Movement only: no collision, gravity, jumping, interaction, or
 * networking. Follows the same initialize()/update(delta)/dispose()
 * lifecycle used elsewhere in the engine.
 */
export class FirstPersonController {
  /**
   * @param {THREE.PerspectiveCamera} camera - The existing camera to move and look around with.
   * @param {import('../input/InputManager.js').InputManager} inputManager - Source of keyboard/mouse/pointer-lock state.
   * @param {HTMLElement} domElement - The canvas element clicked to request Pointer Lock.
   * @param {import('../managers/SpawnManager.js').SpawnManager} [spawnManager] - Optional; if it has an "arrival" spawn registered, the camera starts there instead of its default startup position.
   */
  constructor(camera, inputManager, domElement, spawnManager) {
    /** @private */
    this._camera = camera;

    /** @private */
    this._inputManager = inputManager;

    /** @private */
    this._domElement = domElement;

    /** @private */
    this._spawnManager = spawnManager;

    /**
     * Current look angles, in radians. Seeded from the camera's
     * actual orientation in initialize() (not here — the camera may
     * still be reframed by the active scene after construction but
     * before initialize() runs), so mouse look starts from whatever
     * view the scene set up rather than snapping to zero.
     * @private
     */
    this._yaw = 0;

    /** @private */
    this._pitch = 0;

    /**
     * Local-space input direction for the current frame, reused
     * every frame instead of being reallocated.
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
     * current yaw. Created once and reused every frame.
     * @private @type {THREE.Vector3}
     */
    this._upAxis = new THREE.Vector3(0, 1, 0);

    /** @private */
    this._onClick = this._onClick.bind(this);
  }

  /**
   * Sets the camera's rotation order for FPS-style look (yaw applied
   * before pitch, avoiding roll drift), places the camera at the
   * registered "arrival" spawn point if one exists (otherwise leaves
   * it at whatever the active scene already set up), seeds yaw/pitch
   * from the camera's resulting orientation, and starts listening
   * for clicks on the canvas to engage Pointer Lock.
   */
  initialize() {
    this._camera.rotation.order = 'YXZ';

    this._applyArrivalSpawn();

    this._yaw = this._camera.rotation.y;
    this._pitch = this._camera.rotation.x;

    this._domElement.addEventListener(CLICK_EVENT, this._onClick);
  }

  /**
   * Places the camera at the registered "arrival" spawn point, if
   * SpawnManager has one. If not, this is a no-op — the camera stays
   * exactly where the active scene already put it (BootScene's
   * establishing shot) — and a warning is logged so a missing spawn
   * is visible rather than silently swallowed.
   *
   * Rotation is applied via rotation.set(x, y, z) without a 4th
   * (order) argument, deliberately — that preserves the 'YXZ' order
   * just set above. Using rotation.copy(spawn.rotation) instead would
   * overwrite the order back to the spawn Euler's own default ('XYZ'),
   * silently breaking the yaw/pitch composition mouse look depends on.
   * @private
   */
  _applyArrivalSpawn() {
    const spawn = this._spawnManager?.getSpawn(ARRIVAL_SPAWN_ID);

    if (!spawn) {
      console.warn(
        `FirstPersonController: no "${ARRIVAL_SPAWN_ID}" spawn registered; using the camera's current startup position/rotation instead.`
      );
      return;
    }

    this._camera.position.copy(spawn.position);
    this._camera.rotation.set(spawn.rotation.x, spawn.rotation.y, spawn.rotation.z);
  }

  /**
   * Applies mouse look (only while Pointer Lock is active) and WASD
   * movement for the current frame. Entirely delta-time based, so
   * movement speed doesn't change with frame rate.
   * @param {number} delta - Time in seconds since the last frame.
   */
  update(delta) {
    if (this._inputManager.isPointerLocked()) {
      this._applyMouseLook();
    }
    this._applyMovement(delta);
  }

  /**
   * Stops listening for canvas clicks. Does not touch the camera's
   * transform or exit Pointer Lock — both are owned elsewhere.
   */
  dispose() {
    this._domElement.removeEventListener(CLICK_EVENT, this._onClick);
  }

  /**
   * Rotates the camera from accumulated mouse movement, clamping
   * vertical look so the camera can't flip past straight up/down.
   * @private
   */
  _applyMouseLook() {
    const mouseDelta = this._inputManager.getMouseDelta();

    this._yaw -= mouseDelta.x * MOUSE_SENSITIVITY;
    this._pitch -= mouseDelta.y * MOUSE_SENSITIVITY;
    this._pitch = THREE.MathUtils.clamp(this._pitch, -MAX_PITCH, MAX_PITCH);

    this._camera.rotation.set(this._pitch, this._yaw, 0);
  }

  /**
   * Moves the camera based on held WASD/sprint keys, relative to the
   * current yaw so "forward" always means "the way you're facing,"
   * regardless of vertical look angle.
   * @param {number} delta - Time in seconds since the last frame.
   * @private
   */
  _applyMovement(delta) {
    const forward = this._inputManager.isKeyDown(MOVEMENT_KEYS.FORWARD);
    const backward = this._inputManager.isKeyDown(MOVEMENT_KEYS.BACKWARD);
    const left = this._inputManager.isKeyDown(MOVEMENT_KEYS.LEFT);
    const right = this._inputManager.isKeyDown(MOVEMENT_KEYS.RIGHT);

    this._inputDirection.set(Number(right) - Number(left), 0, Number(backward) - Number(forward));

    if (this._inputDirection.lengthSq() === 0) {
      return;
    }

    this._inputDirection.normalize();

    const speed = this._inputManager.isKeyDown(MOVEMENT_KEYS.SPRINT) ? SPRINT_SPEED : WALK_SPEED;

    this._movement
      .copy(this._inputDirection)
      .applyAxisAngle(this._upAxis, this._yaw)
      .multiplyScalar(speed * delta);

    this._camera.position.add(this._movement);
  }

  /**
   * Requests Pointer Lock on the canvas when it's clicked. Escape
   * exits Pointer Lock automatically via the browser's native
   * behavior, so no explicit key handling is needed for that side.
   * @private
   */
  _onClick() {
    this._inputManager.requestPointerLock(this._domElement);
  }
}
