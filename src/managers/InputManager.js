/**
 * DOM event names InputManager listens for, named here so none of
 * them appear as bare string literals in the handler-registration code.
 */

const DOM_EVENTS = {
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  MOUSE_MOVE: 'mousemove',
  POINTER_LOCK_CHANGE: 'pointerlockchange',
  POINTER_LOCK_ERROR: 'pointerlockerror',
};

/**
 * @typedef {object} MouseDelta
 * @property {number} x - Accumulated horizontal mouse movement, in pixels, since the last update().
 * @property {number} y - Accumulated vertical mouse movement, in pixels, since the last update().
 */

/**
 * Sole authority for raw browser input in Echo Manor. InputManager
 * listens for keyboard and mouse events, tracks key state, and
 * manages the Pointer Lock API, then exposes a small, clean polling
 * API for the rest of the engine to read from.
 *
 * No other system should attach its own keyboard/mouse/pointer-lock
 * DOM listeners — PlayerController, UI, Inventory, Interaction, and
 * Networking are all expected to read input through this class
 * instead. InputManager itself knows nothing about gameplay, Three.js,
 * or any consumer of its state; it only observes the browser.
 *
 * Usage follows the same initialize()/update()/dispose() lifecycle
 * used elsewhere in the engine: call initialize() once at startup,
 * update() once per frame (before anything reads this frame's input),
 * and dispose() on shutdown.
 */
export class InputManager {
  constructor() {
    /**
     * Keys currently held down, keyed by KeyboardEvent.code
     * (e.g. "KeyW", "Space", "ArrowUp").
     * @private @type {Set<string>}
     */
    this._heldKeys = new Set();

    /**
     * Keys that transitioned from up to down during the current
     * frame. Cleared every update().
     * @private @type {Set<string>}
     */
    this._pressedKeys = new Set();

    /**
     * Keys that transitioned from down to up during the current
     * frame. Cleared every update().
     * @private @type {Set<string>}
     */
    this._releasedKeys = new Set();

    /**
     * Accumulated mouse movement since the last update(), in pixels.
     * @private
     */
    this._mouseDeltaX = 0;

    /** @private */
    this._mouseDeltaY = 0;

    /** @private @type {boolean} */
    this._isPointerLocked = false;

    /**
     * The element most recently passed to requestPointerLock(), kept
     * only for reference — lock state itself is read from the
     * document, not derived from this.
     * @private @type {Element|null}
     */
    this._pointerLockElement = null;

    /** @private */
    this._onKeyDown = this._onKeyDown.bind(this);
    /** @private */
    this._onKeyUp = this._onKeyUp.bind(this);
    /** @private */
    this._onMouseMove = this._onMouseMove.bind(this);
    /** @private */
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    /** @private */
    this._onPointerLockError = this._onPointerLockError.bind(this);
  }

  /**
   * Registers every browser event listener InputManager relies on.
   * Call once, before the first update().
   */
  initialize() {
    window.addEventListener(DOM_EVENTS.KEY_DOWN, this._onKeyDown);
    window.addEventListener(DOM_EVENTS.KEY_UP, this._onKeyUp);
    window.addEventListener(DOM_EVENTS.MOUSE_MOVE, this._onMouseMove);
    document.addEventListener(DOM_EVENTS.POINTER_LOCK_CHANGE, this._onPointerLockChange);
    document.addEventListener(DOM_EVENTS.POINTER_LOCK_ERROR, this._onPointerLockError);
  }

  /**
   * Advances InputManager to the next frame: clears the one-frame
   * "pressed"/"released" key sets and the accumulated mouse delta.
   * Call exactly once per frame, before anything reads this frame's
   * input, so held-key state (isKeyDown) persists across frames
   * while the one-frame state doesn't.
   */
  update() {
    this._pressedKeys.clear();
    this._releasedKeys.clear();
    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;
  }

  /**
   * Removes every event listener InputManager registered and clears
   * all tracked state. Safe to call even if initialize() was never
   * called.
   */
  dispose() {
    window.removeEventListener(DOM_EVENTS.KEY_DOWN, this._onKeyDown);
    window.removeEventListener(DOM_EVENTS.KEY_UP, this._onKeyUp);
    window.removeEventListener(DOM_EVENTS.MOUSE_MOVE, this._onMouseMove);
    document.removeEventListener(DOM_EVENTS.POINTER_LOCK_CHANGE, this._onPointerLockChange);
    document.removeEventListener(DOM_EVENTS.POINTER_LOCK_ERROR, this._onPointerLockError);

    this._heldKeys.clear();
    this._pressedKeys.clear();
    this._releasedKeys.clear();
    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;
    this._isPointerLocked = false;
    this._pointerLockElement = null;
  }

  /**
   * Checks whether a key is currently held down.
   * @param {string} code - A KeyboardEvent.code value, e.g. "KeyW".
   * @returns {boolean}
   */
  isKeyDown(code) {
    return this._heldKeys.has(code);
  }

  /**
   * Checks whether a key transitioned from up to down during the
   * current frame. True for exactly one update() cycle per press.
   * @param {string} code - A KeyboardEvent.code value, e.g. "Space".
   * @returns {boolean}
   */
  wasKeyPressed(code) {
    return this._pressedKeys.has(code);
  }

  /**
   * Checks whether a key transitioned from down to up during the
   * current frame. True for exactly one update() cycle per release.
   * @param {string} code - A KeyboardEvent.code value, e.g. "Space".
   * @returns {boolean}
   */
  wasKeyReleased(code) {
    return this._releasedKeys.has(code);
  }

  /**
   * Returns the mouse movement accumulated since the previous
   * update(). The returned object is a snapshot, safe to keep a
   * reference to — it will not change until you call getMouseDelta()
   * again.
   * @returns {MouseDelta}
   */
  getMouseDelta() {
    return { x: this._mouseDeltaX, y: this._mouseDeltaY };
  }

  /**
   * Requests Pointer Lock on the given element. Whether the request
   * actually succeeds is reported asynchronously by the browser —
   * check isPointerLocked() afterward rather than assuming success.
   * @param {Element} element - The element to lock the pointer to.
   */
  requestPointerLock(element) {
    if (!element || typeof element.requestPointerLock !== 'function') {
      return;
    }
    this._pointerLockElement = element;
    element.requestPointerLock();
  }

  /**
   * Exits Pointer Lock, if currently active.
   */
  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  /**
   * Checks whether Pointer Lock is currently active.
   * @returns {boolean}
   */
  isPointerLocked() {
    return this._isPointerLocked;
  }

  /**
   * Handles a physical key being pressed. Ignores the browser's key
   * auto-repeat events for the "pressed this frame" state, since the
   * key is already held by that point.
   * @param {KeyboardEvent} event
   * @private
   */
  _onKeyDown(event) {
    const code = event.code;
    if (!this._heldKeys.has(code)) {
      this._pressedKeys.add(code);
    }
    this._heldKeys.add(code);
  }

  /**
   * Handles a physical key being released.
   * @param {KeyboardEvent} event
   * @private
   */
  _onKeyUp(event) {
    const code = event.code;
    this._heldKeys.delete(code);
    this._releasedKeys.add(code);
  }

  /**
   * Accumulates raw mouse movement for the current frame.
   * @param {MouseEvent} event
   * @private
   */
  _onMouseMove(event) {
    this._mouseDeltaX += event.movementX ?? 0;
    this._mouseDeltaY += event.movementY ?? 0;
  }

  /**
   * Syncs isPointerLocked() with the browser's actual lock state
   * whenever it changes, in either direction.
   * @private
   */
  _onPointerLockChange() {
    this._isPointerLocked = document.pointerLockElement !== null;
  }

  /**
   * Handles a failed Pointer Lock request.
   * @private
   */
  _onPointerLockError() {
    this._isPointerLocked = false;
    console.warn('InputManager: pointer lock request was rejected by the browser.');
  }
}
