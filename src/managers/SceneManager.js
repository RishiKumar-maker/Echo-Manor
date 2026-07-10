import * as THREE from 'three';
import { BACKGROUND_COLOR } from '../config/EngineConfig.js';

/**
 * Owns the Three.js Scene instance for the currently active level.
 */
export class SceneManager {
  constructor() {
    /** @type {THREE.Scene} */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);
  }
}
