import * as THREE from 'three';
import {
  AMBIENT_LIGHT_COLOR,
  AMBIENT_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_COLOR,
  DIRECTIONAL_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_POSITION,
} from '../config/EngineConfig.js';

/**
 * Creates a default, neutral set of lights and adds them to
 * a given scene. This is a starting point only; art direction
 * for specific rooms/puzzles will be handled in later sprints.
 */
export class Lighting {
  /**
   * @param {THREE.Scene} scene - Scene to attach the lights to.
   */
  constructor(scene) {
    /** @type {THREE.AmbientLight} */
    this.ambientLight = new THREE.AmbientLight(
      AMBIENT_LIGHT_COLOR,
      AMBIENT_LIGHT_INTENSITY
    );

    /** @type {THREE.DirectionalLight} */
    this.directionalLight = new THREE.DirectionalLight(
      DIRECTIONAL_LIGHT_COLOR,
      DIRECTIONAL_LIGHT_INTENSITY
    );
    this.directionalLight.position.set(
      DIRECTIONAL_LIGHT_POSITION.x,
      DIRECTIONAL_LIGHT_POSITION.y,
      DIRECTIONAL_LIGHT_POSITION.z
    );

    scene.add(this.ambientLight);
    scene.add(this.directionalLight);
  }
}
