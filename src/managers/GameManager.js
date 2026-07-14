import { SceneManager } from './SceneManager.js';
import { AssetManager } from './AssetManager.js';
import { Renderer } from '../engine/Renderer.js';
import { Camera } from '../engine/Camera.js';
import { GameLoop } from '../engine/GameLoop.js';
import { BootScene } from '../game/scenes/BootScene.js';
import { InputManager } from '../InputManager.js';
import { FirstPersonController } from '../player/FirstPersonController.js';
import { CollisionManager } from '../world/CollisionManager.js';
import { SpawnManager } from './SpawnManager.js';

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
 *
 * InputManager and FirstPersonController provide the first playable
 * movement, applied directly to the existing camera. Each frame,
 * input is read and applied before InputManager.update() clears its
 * one-frame press/release/mouse-delta state — reversing that order
 * would zero the mouse delta before FirstPersonController ever sees it.
 *
 * CollisionManager is owned here as the engine's single collision
 * subsystem, following the same pattern as AssetManager before it —
 * wired into the lifecycle now so future systems have one known
 * place to register/query volumes. It has no per-frame work yet, so
 * it is not part of the update() loop; nothing registers boxes or
 * queries it at this stage.
 *
 * SpawnManager is owned here the same way, as the engine's single
 * store of named spawn locations. It has no per-frame work either,
 * so it is also not part of the update() loop; nothing registers a
 * spawn point at this stage.
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
     * Owns named player spawn locations for the engine. Created
     * before BootScene so it can be handed in as a constructor
     * dependency — BootScene registers the "arrival" spawn point
     * once the manor is positioned.
     * @type {SpawnManager}
     */
    this.spawnManager = new SpawnManager();

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
      spawnManager: this.spawnManager,
    });

    /** @type {InputManager} */
    this.inputManager = new InputManager();

    /**
     * The first playable movement: WASD + sprint + pointer-lock
     * mouse look, applied directly to the existing camera. Places
     * the camera at the registered "arrival" spawn on initialize()
     * if one exists.
     * @type {FirstPersonController}
     */
    this.firstPersonController = new FirstPersonController(
      this.camera.instance,
      this.inputManager,
      this.renderer.domElement,
      this.spawnManager
    );

    /**
     * Owns collision volumes and answers intersection queries for
     * the engine. No boxes are registered and no queries are made
     * yet — this is only the permanent subsystem wiring.
     * @type {CollisionManager}
     */
    this.collisionManager = new CollisionManager();
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

    // TEMPORARY DEBUG — remove once spawn registration is confirmed.
    const spawn = this.spawnManager.getSpawn('arrival');
    console.log('[Spawn]', spawn);

    this.inputManager.initialize();
    this.firstPersonController.initialize();
    this.collisionManager.initialize();
    this.spawnManager.initialize();

    this.gameLoop.start();
  }

  /**
   * Stops the render loop and disposes the active scene.
   */
  stop() {
    this.gameLoop.stop();
    this.firstPersonController.dispose();
    this.inputManager.dispose();
    this.collisionManager.dispose();
    this.spawnManager.dispose();
    this.activeScene?.dispose();
  }

  /**
   * Called once per frame by the GameLoop.
   * @param {number} deltaTime - Time in seconds since the last frame.
   */
  update(deltaTime) {
    this.firstPersonController.update(deltaTime);
    this.inputManager.update();

    this.activeScene.update(deltaTime);
    this.renderer.render(this.sceneManager.scene, this.camera.instance);
  }
}
