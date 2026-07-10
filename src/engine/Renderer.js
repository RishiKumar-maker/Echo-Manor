import * as THREE from 'three';

/**
 * Owns the Three.js WebGLRenderer instance. Does not attach
 * itself to the DOM and does not listen for window resize —
 * the owning Application decides where the canvas lives and
 * drives resizing via the public resize() method.
 */
export class Renderer {
  constructor() {
    /** @type {THREE.WebGLRenderer} */
    this.instance = new THREE.WebGLRenderer({ antialias: true });
    this.instance.setPixelRatio(window.devicePixelRatio);
    this.instance.setSize(window.innerWidth, window.innerHeight);

    /** @type {HTMLCanvasElement} */
    this.domElement = this.instance.domElement;
  }

  /**
   * Renders a scene from the point of view of a camera.
   * @param {THREE.Scene} scene - Scene to render.
   * @param {THREE.Camera} camera - Camera to render from.
   */
  render(scene, camera) {
    this.instance.render(scene, camera);
  }

  /**
   * Resizes the renderer's output to the given dimensions.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.instance.setSize(width, height);
  }
}
