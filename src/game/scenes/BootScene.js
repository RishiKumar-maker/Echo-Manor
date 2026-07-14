import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';

/**
 * Fog color and density: subtle blue-gray, suited to a night scene.
 * Density kept low enough that the manor stays clearly readable at
 * CAMERA_VIEW_POSITION's distance — fog should add atmosphere, not
 * hide the subject.
 */
const FOG_COLOR = 0x0d1420;
const FOG_DENSITY = 0.01;

/**
 * Moonlight (directional light) color, intensity, and position.
 * Intensity nudged up slightly from the original pass so the manor's
 * silhouette and detail read clearly, while staying well short of
 * daylight levels to keep the mysterious night mood.
 */
const MOONLIGHT_COLOR = 0xaac8ff;
const MOONLIGHT_INTENSITY = 1.1;
const MOONLIGHT_POSITION = { x: -30, y: 45, z: -15 };

/** Ambient fill light color and intensity. */
const AMBIENT_COLOR = 0x1a2740;
const AMBIENT_INTENSITY = 0.5;

/** World position for the manor (loaded model or placeholder). */
const MANOR_POSITION = { x: 0, y: 0, z: -20 };

/**
 * Static camera framing, calculated (not guessed) from the target
 * fill fraction using: d = (H/2) / tan(f × FOV/2)
 * where H = MANOR_TARGET_HEIGHT (40), f = desired fraction of
 * vertical FOV the manor should occupy (0.6, middle of the 55–65%
 * target), and FOV = 65°.
 *   half-angle = 0.6 × 32.5° = 19.5°
 *   tan(19.5°) = 0.3541
 *   d = 20 / 0.3541 ≈ 56.5
 * That distance is what actually hits ~60% vertical fill — a
 * closer distance would overfill and crop the manor, which is what
 * was happening before. Y is raised further (to roughly two-thirds
 * of the manor's own height) so the sightline clears foreground
 * tree/terrain height entirely — the "standing on a hill" vantage —
 * and the look-at target sits near ground level at the entrance,
 * producing the downward pitch. X is offset slightly to shift the
 * near-camera parallax off whichever trunk was sitting dead-center;
 * the look-at X target stays at the manor's own X (0), so this
 * shifts the foreground without de-centering the subject.
 */
const CAMERA_FOV = 65;
const CAMERA_VIEW_POSITION = { x: 6, y: 26, z: 36.5 };
const CAMERA_LOOK_AT_HEIGHT = 4;

/** AssetManager manifest id for the manor model. */
const MANOR_MODEL_ID = 'manor';

/** Target height (world units) the loaded manor model gets scaled to. */
const MANOR_TARGET_HEIGHT = 40;

/** SpawnManager id for the player's initial spawn point. */
const ARRIVAL_SPAWN_ID = 'arrival';

/**
 * How far in front of the manor's entrance (world units, beyond its
 * own front-wall bound) the arrival spawn sits — far enough to be
 * clearly outside on the approach path, not right against the wall.
 */
const ARRIVAL_SPAWN_FRONT_CLEARANCE = 10;

/**
 * How far above the manor's own ground level the arrival spawn sits,
 * so the player doesn't spawn exactly at (or inside) ground geometry.
 */
const ARRIVAL_SPAWN_HEIGHT_OFFSET = 0.5;

/**
 * BootScene owns only the first visible world: fog, moonlight,
 * ambient light, and the manor (a loaded model if AssetManager has
 * one, otherwise a placeholder building). The manor model brings
 * its own terrain/ground, so BootScene does not create any ground
 * of its own. It creates no UI, no input handling, no audio, and
 * does no asset loading of its own — every asset request goes
 * through the AssetManager passed in, which is the single source of
 * loading, caching, and manifest resolution for the whole project.
 * If a SpawnManager is provided, BootScene also registers the
 * player's initial "arrival" spawn point once the manor's final
 * position is known — it does not move the camera or player itself.
 *
 * Extends BaseScene and overrides initialize() and dispose(); it has
 * no per-frame behavior, so update() is left as BaseScene's no-op.
 */
export class BootScene extends BaseScene {
  /**
   * @param {object} deps
   * @param {THREE.Scene} deps.scene - Scene to populate.
   * @param {THREE.Camera} deps.camera - Camera to frame on the manor.
   * @param {THREE.WebGLRenderer} deps.renderer - Renderer, checked for existing shadow support.
   * @param {import('../../managers/AssetManager.js').AssetManager} deps.assetManager - Sole source of asset loading; required.
   * @param {import('../../managers/SpawnManager.js').SpawnManager} [deps.spawnManager] - Optional; if provided, the "arrival" spawn point is registered with it once the manor is positioned.
   */
  constructor({ scene, camera, renderer, assetManager, spawnManager } = {}) {
    super();

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.assetManager = assetManager;
    this.spawnManager = spawnManager;

    /** @type {THREE.DirectionalLight|null} */
    this.moonlight = null;

    /** @type {THREE.AmbientLight|null} */
    this.ambientLight = null;

    /** @type {THREE.Object3D|null} */
    this.manor = null;

    /**
     * True when `manor` is the locally-built placeholder (and so
     * safe for this scene to dispose), false when it's a shared
     * instance owned by AssetManager's cache (must not be disposed
     * here — other consumers may still reference it).
     * @private @type {boolean}
     */
    this._manorIsPlaceholder = true;

    /** @type {boolean} */
    this.shadowsEnabled = false;

    /** @private */
    this._disposed = false;
  }

  /**
   * Builds the boot world: fog, lighting, the manor, and camera
   * framing. No separate ground is created — the manor model brings
   * its own terrain, and the placeholder doesn't need one either.
   * @returns {Promise<void>}
   */
  async initialize() {
    this.shadowsEnabled = Boolean(this.renderer?.shadowMap?.enabled);

    this._createFog();
    this._createLighting();
    await this._createManor();
    this._frameCamera();
  }

  /**
   * Removes everything BootScene added to the scene. Only disposes
   * geometries/materials it created itself (a placeholder manor, if
   * in use) — assets obtained from AssetManager are left intact,
   * since AssetManager's cache may still be serving them elsewhere.
   */
  dispose() {
    this._disposed = true;

    if (this.manor) {
      this.scene.remove(this.manor);
      if (this._manorIsPlaceholder) {
        this._disposeObject3D(this.manor);
      }
      this.manor = null;
    }

    if (this.moonlight) {
      this.scene.remove(this.moonlight);
      this.moonlight = null;
    }

    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight = null;
    }

    if (this.scene.fog) {
      this.scene.fog = null;
    }
  }

  /**
   * Returns the currently active manor Object3D — the loaded GLTF
   * model if AssetManager provided one, or the placeholder building
   * if it didn't — so future systems (CollisionManager,
   * InteractionManager, AudioManager, OcclusionManager, etc.) can
   * read its transform and geometry without BootScene giving up
   * ownership. BootScene remains the only thing that creates,
   * positions, scales, and disposes this object; callers only
   * receive a reference to inspect or attach to, not a copy, and not
   * any control over its lifecycle. Returns null before the manor
   * has been created or after this scene has been disposed.
   * @returns {THREE.Object3D|null}
   */
  getManor() {
    return this.manor;
  }

  /**
   * Creates subtle blue-gray exponential fog for a night scene.
   * @private
   */
  _createFog() {
    this.scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);
  }

  /**
   * Creates moonlight and ambient light and adds them to the scene.
   * @private
   */
  _createLighting() {
    this.moonlight = new THREE.DirectionalLight(MOONLIGHT_COLOR, MOONLIGHT_INTENSITY);
    this.moonlight.position.set(
      MOONLIGHT_POSITION.x,
      MOONLIGHT_POSITION.y,
      MOONLIGHT_POSITION.z
    );
    this.moonlight.castShadow = this.shadowsEnabled;

    this.ambientLight = new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY);

    this.scene.add(this.moonlight, this.ambientLight);
  }

  /**
   * Loads the manor model through AssetManager if available,
   * otherwise builds a placeholder so the manor's future location
   * is clear.
   * @private
   */
  async _createManor() {
    const model = await this.assetManager.loadModel(MANOR_MODEL_ID);

    if (this._disposed) return;

    if (model) {
      this.manor = model;
      this._manorIsPlaceholder = false;
    } else {
      this.manor = this._createPlaceholderManor();
      this._manorIsPlaceholder = true;
    }

    this.manor.position.set(MANOR_POSITION.x, MANOR_POSITION.y, MANOR_POSITION.z);

    if (!this._manorIsPlaceholder) {
      this._autoScaleToTarget(this.manor, MANOR_TARGET_HEIGHT);
      this._groundModel(this.manor, MANOR_POSITION.y);
    }

    this._applyShadows(this.manor);

    this.scene.add(this.manor);

    this._registerArrivalSpawn();
  }

  /**
   * Registers the "arrival" spawn point via SpawnManager, placed
   * just outside the manor's entrance on the front approach path and
   * facing it. This runs here, once, right after the manor (whether
   * the real model or the placeholder) has its final position and
   * scale — computing the spawn from the manor's actual bounding box
   * at this moment means it stays correct even if the manor's
   * position, scale, or geometry changes later, instead of drifting
   * out of sync the way a hardcoded world-space guess would.
   * @private
   */
  _registerArrivalSpawn() {
    if (!this.spawnManager) return;

    this.manor.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.manor);

    const position = new THREE.Vector3(
      (bounds.min.x + bounds.max.x) / 2,
      bounds.min.y + ARRIVAL_SPAWN_HEIGHT_OFFSET,
      bounds.max.z + ARRIVAL_SPAWN_FRONT_CLEARANCE
    );

    // No yaw needed: FirstPersonController treats an unrotated
    // forward direction as -Z, and the manor's front sits at a
    // smaller Z than this spawn — so facing "straight ahead" from
    // here already faces the entrance.
    const rotation = new THREE.Euler(0, 0, 0);

    this.spawnManager.registerSpawn(ARRIVAL_SPAWN_ID, position, rotation);
  }

  /**
   * Builds a simple, clearly-marked placeholder building so the
   * manor's eventual footprint and location are visible at a glance.
   * @returns {THREE.Group}
   * @private
   */
  _createPlaceholderManor() {
    const group = new THREE.Group();
    group.name = 'ManorPlaceholder';

    const bodyGeometry = new THREE.BoxGeometry(18, 12, 14);
    const roofGeometry = new THREE.BoxGeometry(20, 3, 16);

    const fillMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc44ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.9,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xcc44ff });

    const body = new THREE.Mesh(bodyGeometry, fillMaterial);
    body.position.y = 6;

    const roof = new THREE.Mesh(roofGeometry, fillMaterial.clone());
    roof.position.y = 13.5;

    const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeometry), edgeMaterial);
    bodyEdges.position.copy(body.position);

    const roofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roofGeometry), edgeMaterial);
    roofEdges.position.copy(roof.position);

    group.add(body, roof, bodyEdges, roofEdges);

    return group;
  }

  /**
   * Positions the camera so the manor reads as large and imposing,
   * and applies the tuned FOV. Static framing only — no animation.
   * @private
   */
  _frameCamera() {
    if (!this.camera) return;

    this.camera.position.set(
      CAMERA_VIEW_POSITION.x,
      CAMERA_VIEW_POSITION.y,
      CAMERA_VIEW_POSITION.z
    );
    this.camera.lookAt(MANOR_POSITION.x, CAMERA_LOOK_AT_HEIGHT, MANOR_POSITION.z);

    if (typeof this.camera.fov === 'number') {
      this.camera.fov = CAMERA_FOV;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Applies shadow casting/receiving across a mesh hierarchy, only
   * if the renderer already has shadows enabled.
   * @param {THREE.Object3D} object3D
   * @private
   */
  _applyShadows(object3D) {
    if (!this.shadowsEnabled) return;

    object3D.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Uniformly scales a loaded model so its height matches a target
   * size. GLTF files can be authored at wildly different unit scales,
   * so this keeps the manor a sensible size regardless of how the
   * source file was exported.
   * @param {THREE.Object3D} object3D
   * @param {number} targetHeight
   * @private
   */
  _autoScaleToTarget(object3D, targetHeight) {
    const box = new THREE.Box3().setFromObject(object3D);
    const size = box.getSize(new THREE.Vector3());
    if (size.y <= 0) return;

    const scale = targetHeight / size.y;
    object3D.scale.setScalar(scale);
  }

  /**
   * Shifts an object vertically so the base of its bounding box sits
   * exactly at ground level, regardless of where the source model's
   * own pivot/origin was authored. Without this, a model whose
   * pivot isn't at its base can end up partially buried in or
   * floating above the ground after scaling.
   * @param {THREE.Object3D} object3D
   * @param {number} groundY
   * @private
   */
  _groundModel(object3D, groundY) {
    const box = new THREE.Box3().setFromObject(object3D);
    const offset = groundY - box.min.y;
    object3D.position.y += offset;
  }

  /**
   * Disposes geometries and materials across an object hierarchy.
   * Only ever called on locally-built content (the placeholder),
   * never on assets owned by AssetManager's cache.
   * @param {THREE.Object3D} object3D
   * @private
   */
  _disposeObject3D(object3D) {
    object3D.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }
}
