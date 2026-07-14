import * as THREE from 'three';

/** Thickness of each exterior wall collider, in world units. */
const WALL_THICKNESS = 1;

/**
 * Height of each exterior wall collider, in world units, measured up
 * from the manor's own ground leve l. Deliberately shorter than the
 * manor's full height — tall enough to block the player, no need to
 * reach the roofline for a walking collider.
 */
const WALL_HEIGHT = 30;

/**
 * Width of the gap left open in the front wall for the entrance, in
 * world units, centered on the manor's horizontal midpoint.
 */
const ENTRANCE_WIDTH = 6;

/**
 * Builds a small, fixed set of hand-authored Box3 wall colliders
 * around a loaded manor model, and registers them with a
 * CollisionManager. This is deliberately not per-mesh auto-generated
 * collision: the manor GLB's ~267 meshes have no reliable names or
 * hierarchy to derive individual colliders from safely (see the
 * manor inspection report), so instead this builder manually shapes
 * five simple slabs — left wall, right wall, rear wall, and the
 * front wall split into two segments around an entrance gap — using
 * the manor's own overall bounding box only as a placement reference.
 *
 * ManorCollisionBuilder does not perform any collision queries and
 * does not touch player movement — it only builds and registers
 * boxes, and can later remove exactly the boxes it added.
 */
export class ManorCollisionBuilder {
  constructor() {
    /**
     * The CollisionManager these boxes were registered with, kept
     * so dispose() can remove exactly what initialize() added.
     * @private @type {import('./CollisionManager.js').CollisionManager|null}
     */
    this._collisionManager = null;

    /**
     * Every Box3 this builder has created and registered.
     * @private @type {THREE.Box3[]}
     */
    this._boxes = [];
  }

  /**
   * Computes the manor's overall world-space bounds and registers
   * five wall colliders around them with the given CollisionManager:
   * left wall, right wall, rear wall, and a front wall split into
   * two segments with a gap between them for the entrance.
   * @param {import('./CollisionManager.js').CollisionManager} collisionManager - Manager to register the built boxes with.
   * @param {THREE.Object3D} manor - The loaded manor (or placeholder) to build colliders around.
   */
  initialize(collisionManager, manor) {
    this._collisionManager = collisionManager;

    const bounds = new THREE.Box3().setFromObject(manor);

    const boxes = [
      this._createLeftWall(bounds),
      this._createRightWall(bounds),
      this._createRearWall(bounds),
      ...this._createFrontWallWithEntrance(bounds),
    ];

    boxes.forEach((box) => {
      this._boxes.push(box);
      this._collisionManager.addBox(box);
    });
  }

  /**
   * Removes every box this builder registered from its
   * CollisionManager and clears its own references. Safe to call
   * even if initialize() was never called.
   */
  dispose() {
    if (this._collisionManager) {
      this._boxes.forEach((box) => this._collisionManager.removeBox(box));
    }

    this._boxes = [];
    this._collisionManager = null;
  }

  /**
   * Builds a thin vertical slab along the manor's left (min X) edge,
   * spanning its full depth.
   * @param {THREE.Box3} bounds - The manor's overall world-space bounds.
   * @returns {THREE.Box3}
   * @private
   */
  _createLeftWall(bounds) {
    return new THREE.Box3(
      new THREE.Vector3(bounds.min.x - WALL_THICKNESS, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.min.x, bounds.min.y + WALL_HEIGHT, bounds.max.z)
    );
  }

  /**
   * Builds a thin vertical slab along the manor's right (max X) edge,
   * spanning its full depth.
   * @param {THREE.Box3} bounds - The manor's overall world-space bounds.
   * @returns {THREE.Box3}
   * @private
   */
  _createRightWall(bounds) {
    return new THREE.Box3(
      new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x + WALL_THICKNESS, bounds.min.y + WALL_HEIGHT, bounds.max.z)
    );
  }

  /**
   * Builds a thin vertical slab along the manor's rear (min Z) edge,
   * spanning its full width.
   * @param {THREE.Box3} bounds - The manor's overall world-space bounds.
   * @returns {THREE.Box3}
   * @private
   */
  _createRearWall(bounds) {
    return new THREE.Box3(
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z - WALL_THICKNESS),
      new THREE.Vector3(bounds.max.x, bounds.min.y + WALL_HEIGHT, bounds.min.z)
    );
  }

  /**
   * Builds the front (max Z) wall as two segments with a gap left
   * open between them — the front entrance area — centered on the
   * manor's horizontal midpoint.
   * @param {THREE.Box3} bounds - The manor's overall world-space bounds.
   * @returns {THREE.Box3[]} Exactly two boxes: the segments left and right of the entrance gap.
   * @private
   */
  _createFrontWallWithEntrance(bounds) {
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const halfGap = ENTRANCE_WIDTH / 2;

    const leftOfEntrance = new THREE.Box3(
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
      new THREE.Vector3(centerX - halfGap, bounds.min.y + WALL_HEIGHT, bounds.max.z + WALL_THICKNESS)
    );

    const rightOfEntrance = new THREE.Box3(
      new THREE.Vector3(centerX + halfGap, bounds.min.y, bounds.max.z),
      new THREE.Vector3(bounds.max.x, bounds.min.y + WALL_HEIGHT, bounds.max.z + WALL_THICKNESS)
    );

    return [leftOfEntrance, rightOfEntrance];
  }
}
