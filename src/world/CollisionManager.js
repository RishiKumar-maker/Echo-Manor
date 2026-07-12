import * as THREE from 'three';

/**
 * Stores axis-aligned collision volumes and answers simple
 * sphere-vs-box intersection queries. This is not a physics engine —
 * there are no forces, no collision resolution, and no continuous
 * detection over time. It only owns a set of THREE.Box3 colliders
 * and answers a single query: does this sphere intersect any of them.
 *
 * CollisionManager knows nothing about BootScene, GameManager,
 * PlayerController, or any other system — it is purely storage and
 * queries, for other systems to build movement-blocking logic on top of.
 */
export class CollisionManager {
  constructor() {
    /**
     * Registered collision volumes.
     * @private @type {THREE.Box3[]}
     */
    this._boxes = [];

    /**
     * Reused Sphere instance for intersectsSphere() queries, so no
     * new Sphere is allocated on every call/frame.
     * @private @type {THREE.Sphere}
     */
    this._querySphere = new THREE.Sphere();
  }

  /**
   * Prepares internal state. Currently a no-op beyond what the
   * constructor already sets up — present so CollisionManager
   * follows the same initialize()/dispose() lifecycle used by other
   * systems in the engine.
   */
  initialize() {}

  /**
   * Releases every registered collider reference. Safe to call even
   * if initialize() was never called.
   */
  dispose() {
    this.clear();
  }

  /**
   * Removes every registered collision volume.
   */
  clear() {
    this._boxes.length = 0;
  }

  /**
   * Registers a box as a collision volume. Stored by reference — if
   * the box's min/max are mutated afterward, the registered collider
   * reflects that change on the next query. A falsy or non-Box3-like
   * value is ignored with a console warning rather than being stored
   * and failing later, confusingly, inside intersectsSphere().
   * @param {THREE.Box3} box - The axis-aligned box to register.
   */
  addBox(box) {
    if (!box || typeof box.intersectsSphere !== 'function') {
      console.warn('CollisionManager.addBox: expected a THREE.Box3-like object; ignored.', box);
      return;
    }

    this._boxes.push(box);
  }

  /**
   * Unregisters a previously added box. Compares by reference; a
   * box not currently registered is a no-op.
   * @param {THREE.Box3} box - The exact box instance previously passed to addBox().
   */
  removeBox(box) {
    const index = this._boxes.indexOf(box);
    if (index !== -1) {
      this._boxes.splice(index, 1);
    }
  }

  /**
   * Checks whether a sphere intersects any registered box. Uses a
   * single reused Sphere instance and a plain indexed loop, so
   * calling this every frame allocates nothing — not even a callback
   * closure. An invalid center or radius logs a warning and returns
   * false rather than throwing or silently comparing against NaN.
   * @param {THREE.Vector3} center - World-space center of the sphere to test.
   * @param {number} radius - Radius of the sphere to test.
   * @returns {boolean} True if the sphere intersects at least one registered box.
   */
  intersectsSphere(center, radius) {
    if (!center || typeof radius !== 'number' || !Number.isFinite(radius)) {
      console.warn('CollisionManager.intersectsSphere: invalid center or radius; returning false.');
      return false;
    }

    this._querySphere.center.copy(center);
    this._querySphere.radius = radius;

    for (let i = 0; i < this._boxes.length; i++) {
      if (this._boxes[i].intersectsSphere(this._querySphere)) {
        return true;
      }
    }

    return false;
  }
}
