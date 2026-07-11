import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';

/** Ground plane size, in world units. Only used for the fallback ground. */
const GROUND_SIZE = 200;

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
const MANOR_POSITION = { x: 0, y: 0, z: -15 };

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
const CAMERA_VIEW_POSITION = { x: -10, y: 10, z: 0 };
const CAMERA_LOOK_AT_HEIGHT = 14;

/** AssetManager manifest ids this scene asks for. */
const MANOR_MODEL_ID = 'manor';
const GROUND_TEXTURE_ID = 'groundDiffuse';

/** Target height (world units) the loaded manor model gets scaled to. */
const MANOR_TARGET_HEIGHT = 40;

/**
 * BootScene owns only the first visible world: fog, moonlight,
 * ambient light, the manor (a loaded model if AssetManager has one,
 * otherwise a placeholder building), and a fallback ground plane —
 * only created when the placeholder is in use, since a successfully
 * loaded manor model brings its own terrain and environment. It
 * creates no UI, no input handling, no audio, and does no asset
 * loading of its own — every asset request goes through the
 * AssetManager passed in, which is the single source of loading,
 * caching, and manifest resolution for the whole project.
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
   */
  constructor({ scene, camera, renderer, assetManager } = {}) {
    super();

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.assetManager = assetManager;

    /** @type {THREE.Mesh|null} */
    this.ground = null;

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
   * framing. The fallback ground plane is only created if the real
   * manor model isn't available — the loaded model brings its own
   * terrain/environment, so no separate ground is added on top of it.
   * @returns {Promise<void>}
   */
  async initialize() {
    this.shadowsEnabled = Boolean(this.renderer?.shadowMap?.enabled);

    this._createFog();
    this._createLighting();
    await this._createManor();

    if (this._manorIsPlaceholder) {
      await this._createGround();
    }

    this._frameCamera();
  }

  /**
   * Removes everything BootScene added to the scene. Only disposes
   * geometries/materials it created itself (the ground mesh and any
   * placeholder manor) — assets obtained from AssetManager are left
   * intact, since AssetManager's cache may still be serving them
   * elsewhere.
   */
  dispose() {
    this._disposed = true;

    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      this.ground.material.dispose();
      this.ground = null;
    }

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
   * Creates the fallback ground plane, using AssetManager's texture
   * if one is available, otherwise a dark gray material. Only called
   * when the manor model wasn't available and the placeholder is in
   * use — a successfully loaded manor brings its own terrain.
   * @private
   */
  async _createGround() {
    const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const texture = await this.assetManager.loadTexture(GROUND_TEXTURE_ID);

    if (this._disposed) return;

    const material = texture
      ? new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })
      : new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 });

    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = this.shadowsEnabled;

    this.scene.add(this.ground);
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
