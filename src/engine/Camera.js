import * as THREE from 'three';
import {
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_START_POSITION,
} from '../config/EngineConfig.js';

/**
 * Owns the main PerspectiveCamera used to view the scene.
 * Does not listen for window resize itself — the owning
 * Application drives resizing via the public resize() method.
 */
export class Camera {
  constructor() {
    /** @type {THREE.PerspectiveCamera} */
    this.instance = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_NEAR,
      CAMERA_FAR
    );

    this.instance.position.set(
      CAMERA_START_POSITION.x,
      CAMERA_START_POSITION.y,
      CAMERA_START_POSITION.z
    );
  }

  /**
   * Updates the camera's aspect ratio to match the given dimensions.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.instance.aspect = width / height;
    this.instance.updateProjectionMatrix();
  }
}
