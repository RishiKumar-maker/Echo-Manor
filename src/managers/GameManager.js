import { SceneManager } from './SceneManager.js';
import { AssetManager } from './AssetManager.js';
import { Renderer } from '../engine/Renderer.js';
import { Camera } from '../engine/Camera.js';
import { GameLoop } from '../engine/GameLoop.js';
import { BootScene } from '../game/scenes/BootScene.js';

/**
 * Creates every core manager/subsystem and wires them together.
 *
 * GameManager owns exactly one active scene at a time (currently
 * BootScene). The scene itself owns its world objects — meshes,
 * lights, fog, loaded models — and is responsible for creating and
 * disposing them. GameManager does not touch scene content directly;
 * it only controls the scene's lifecycle, calling initialize() once,
 * update() every frame, and dispose() on shutdown or when swapping
 * to a different scene. Future scene switching means reassigning
 * activeScene to a new BaseScene subclass and driving it the same way.
 *
 * AssetManager is the single source of asset loading for every
 * scene. GameManager loads its manifest before initializing the
 * active scene, so any assets the scene requests are resolvable
 * (or safely absent) from the moment initialize() runs.
 */
export class GameManager {
  constructor() {
    /** @type {SceneManager} */
    this.sceneManager = new SceneManager();

    /** @type {AssetManager} */
    this.assetManager = new AssetManager();

    /** @type {Renderer} */
    this.renderer = new Renderer();

    /** @type {Camera} */
    this.camera = new Camera();

    /** @type {GameLoop} */
    this.gameLoop = new GameLoop((deltaTime) => this.update(deltaTime));

    /**
     * The single active scene. BootScene owns the visual world
     * (ground, fog, lighting, manor) itself, so the generic engine
     * Lighting default is not wired in here — the active scene is
     * responsible for its own lighting content.
     * @type {BootScene}
     */
    this.activeScene = new BootScene({
      scene: this.sceneManager.scene,
      camera: this.camera.instance,
      renderer: this.renderer.instance,
      assetManager: this.assetManager,
    });
  }

  /**
   * Loads the asset manifest, initializes the active scene, and
   * starts the render loop. The manifest must be ready before the
   * scene initializes, since it resolves every asset id it needs
   * (manor model, ground texture) through AssetManager.
   * @returns {Promise<void>}
   */
  async init() {
    await this.assetManager.initialize();
    await this.activeScene.initialize();
    this.gameLoop.start();
  }

  /**
   * Stops the render loop and disposes the active scene.
   */
  stop() {
    this.gameLoop.stop();
    this.activeScene?.dispose();
  }

  /**
   * Called once per frame by the GameLoop.
   * @param {number} deltaTime - Time in seconds since the last frame.
   */
  update(deltaTime) {
    this.activeScene.update(deltaTime);
    this.renderer.render(this.sceneManager.scene, this.camera.instance);
  }
}
