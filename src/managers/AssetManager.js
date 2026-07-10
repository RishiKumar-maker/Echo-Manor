import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Location of the manifest, relative to the configured base URL.
 * Resolved against import.meta.env.BASE_URL so it still works when
 * the site is deployed under a GitHub Pages project subpath.
 */
const MANIFEST_PATH = 'assets/manifest.json';

/**
 * Manifest categories AssetManager understands. Each maps an asset
 * id to a path relative to public/assets/.
 */
const ASSET_TYPES = ['models', 'textures', 'audio', 'json'];

/**
 * @typedef {Record<string, string>} ManifestCategory
 * @typedef {{ models: ManifestCategory, textures: ManifestCategory, audio: ManifestCategory, json: ManifestCategory }} Manifest
 */

/**
 * Manifest-driven asset pipeline. Loads public/assets/manifest.json,
 * then resolves every subsequent asset request against it — nothing
 * is hardcoded and nothing is preloaded. Each asset loads at most
 * once: concurrent requests for the same id share one in-flight
 * load, and completed loads are served from cache.
 *
 * Missing or failed assets resolve to null rather than throwing, so
 * a caller can always check the result instead of wrapping every
 * call in a try/catch.
 */
export class AssetManager {
  constructor() {
    /** @type {Manifest|null} */
    this.manifest = null;

    /** @type {Map<string, unknown>} */
    this.cache = new Map();

    /** @private @type {Map<string, Promise<unknown>>} */
    this._inFlight = new Map();

    /** @private */
    this._gltfLoader = new GLTFLoader();

    /** @private */
    this._textureLoader = new THREE.TextureLoader();

    /** @type {number} */
    this.loadedAssets = 0;

    /** @type {number} */
    this.totalAssets = 0;
  }

  /**
   * Fraction of manifest-declared assets currently loaded, 0–1.
   * @returns {number}
   */
  get progress() {
    if (this.totalAssets === 0) return 0;
    return this.loadedAssets / this.totalAssets;
  }

  /**
   * Bootstraps the pipeline by loading the manifest. Safe to call
   * once at startup; further asset loads happen on demand after this.
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.loadManifest();
  }

  /**
   * Loads and parses public/assets/manifest.json. On failure, logs a
   * single descriptive error and falls back to an empty manifest so
   * the app keeps running — every asset lookup afterward just misses
   * safely instead of the whole pipeline being unusable.
   * @returns {Promise<void>}
   */
  async loadManifest() {
    if (this.manifest) return;

    const url = this._resolveUrl(MANIFEST_PATH);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const raw = await response.json();
      this.manifest = this._normalizeManifest(raw);
    } catch (error) {
      console.error(`AssetManager: could not load manifest at "${url}". Asset lookups will return null until this is fixed.`, error);
      this.manifest = this._normalizeManifest(null);
    }

    this.totalAssets = ASSET_TYPES.reduce(
      (total, type) => total + Object.keys(this.manifest[type]).length,
      0
    );
  }

  /**
   * Loads (or returns the cached) 3D model for a manifest id.
   * @param {string} id
   * @returns {Promise<THREE.Object3D|null>}
   */
  async loadModel(id) {
    return this._loadCached(id, 'models', (url) => this._loadGLTF(url));
  }

  /**
   * Loads (or returns the cached) texture for a manifest id.
   * @param {string} id
   * @returns {Promise<THREE.Texture|null>}
   */
  async loadTexture(id) {
    return this._loadCached(id, 'textures', (url) => this._loadTextureFile(url));
  }

  /**
   * Loads (or returns the cached) audio data for a manifest id.
   * Resolves to a raw ArrayBuffer — decoding into an AudioBuffer is
   * left to whichever audio system eventually owns an AudioContext.
   * @param {string} id
   * @returns {Promise<ArrayBuffer|null>}
   */
  async loadAudio(id) {
    return this._loadCached(id, 'audio', (url) => this._fetchArrayBuffer(url));
  }

  /**
   * Loads (or returns the cached) JSON data for a manifest id
   * (puzzle definitions, configuration, etc.).
   * @param {string} id
   * @returns {Promise<unknown|null>}
   */
  async loadJSON(id) {
    return this._loadCached(id, 'json', (url) => this._fetchJSON(url));
  }

  /**
   * Retrieves an already-loaded asset from the cache.
   * Does not trigger a load — use loadModel/loadTexture/loadAudio/loadJSON for that.
   * @param {string} id
   * @returns {unknown|null}
   */
  get(id) {
    return this.cache.has(id) ? this.cache.get(id) : null;
  }

  /**
   * Checks whether an id is declared anywhere in the manifest — i.e.
   * whether it's a valid, loadable asset — regardless of whether it
   * has actually been loaded yet. Use get(id) to check load state.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._findType(id) !== null;
  }

  /**
   * Disposes and removes every cached asset. The manifest itself is
   * kept, so assets can be loaded again afterward on demand.
   */
  clear() {
    for (const asset of this.cache.values()) {
      this._disposeAsset(asset);
    }
    this.cache.clear();
    this._inFlight.clear();
    this.loadedAssets = 0;
  }

  /**
   * Full teardown: clears the cache and drops the manifest.
   */
  dispose() {
    this.clear();
    this.manifest = null;
    this.totalAssets = 0;
  }

  /**
   * Shared implementation behind every loadX() method: resolves the
   * asset's path from the manifest, serves the cache or an in-flight
   * request if one exists, otherwise loads it exactly once.
   * @param {string} id
   * @param {'models'|'textures'|'audio'|'json'} type
   * @param {(url: string) => Promise<unknown>} loadFn
   * @returns {Promise<unknown|null>}
   * @private
   */
  async _loadCached(id, type, loadFn) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    if (this._inFlight.has(id)) {
      return this._inFlight.get(id);
    }

    const path = this.manifest?.[type]?.[id];
    if (!path) {
      console.warn(`AssetManager: no "${type}" entry named "${id}" in the manifest.`);
      return null;
    }

    const promise = loadFn(this._resolveUrl(`assets/${path}`))
      .then((asset) => {
        this.cache.set(id, asset);
        this.loadedAssets += 1;
        return asset;
      })
      .catch((error) => {
        console.error(`AssetManager: failed to load "${type}" asset "${id}" from "${path}".`, error);
        return null;
      })
      .finally(() => {
        this._inFlight.delete(id);
      });

    this._inFlight.set(id, promise);
    return promise;
  }

  /**
   * Finds which manifest category (if any) declares the given id.
   * @param {string} id
   * @returns {'models'|'textures'|'audio'|'json'|null}
   * @private
   */
  _findType(id) {
    if (!this.manifest) return null;
    return ASSET_TYPES.find((type) => Object.prototype.hasOwnProperty.call(this.manifest[type], id)) ?? null;
  }

  /**
   * Fills in any missing manifest categories with empty objects so
   * every lookup can safely assume all four keys exist.
   * @param {Partial<Manifest>|null} raw
   * @returns {Manifest}
   * @private
   */
  _normalizeManifest(raw) {
    const normalized = {};
    for (const type of ASSET_TYPES) {
      normalized[type] = raw && typeof raw[type] === 'object' && raw[type] !== null ? raw[type] : {};
    }
    return normalized;
  }

  /**
   * Resolves a project-relative path against Vite's configured base
   * URL, so links keep working under a GitHub Pages subpath.
   * @param {string} path
   * @returns {string}
   * @private
   */
  _resolveUrl(path) {
    return `${import.meta.env.BASE_URL}${path}`;
  }

  /**
   * @param {string} url
   * @returns {Promise<THREE.Object3D>}
   * @private
   */
  _loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this._gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }

  /**
   * @param {string} url
   * @returns {Promise<THREE.Texture>}
   * @private
   */
  _loadTextureFile(url) {
    return new Promise((resolve, reject) => {
      this._textureLoader.load(url, resolve, undefined, reject);
    });
  }

  /**
   * @param {string} url
   * @returns {Promise<ArrayBuffer>}
   * @private
   */
  async _fetchArrayBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return response.arrayBuffer();
  }

  /**
   * @param {string} url
   * @returns {Promise<unknown>}
   * @private
   */
  async _fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return response.json();
  }

  /**
   * Disposes GPU resources for a cached asset, if it holds any.
   * @param {unknown} asset
   * @private
   */
  _disposeAsset(asset) {
    if (!asset) return;

    if (asset.isTexture) {
      asset.dispose();
      return;
    }

    if (typeof asset.traverse === 'function') {
      asset.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
      });
    }
  }
}
