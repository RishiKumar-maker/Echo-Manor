/**
 * Shared constants for the engine foundation.
 * Add new constants here rather than hard-coding values
 * inside individual modules.
 */

/** Default camera field of view, in degrees. */
export const CAMERA_FOV = 75;

/** Default camera near clipping plane. */
export const CAMERA_NEAR = 0.1;

/** Default camera far clipping plane. */
export const CAMERA_FAR = 1000;

/** Default starting position of the camera. */
export const CAMERA_START_POSITION = { x: 0, y: 1.6, z: 5 };

/** Default scene background color. */
export const BACKGROUND_COLOR = 0x1a1a1a;

/** Default ambient light color and intensity. */
export const AMBIENT_LIGHT_COLOR = 0xffffff;
export const AMBIENT_LIGHT_INTENSITY = 0.4;

/** Default directional light color, intensity, and position. */
export const DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DIRECTIONAL_LIGHT_INTENSITY = 0.8;
export const DIRECTIONAL_LIGHT_POSITION = { x: 5, y: 10, z: 7 };
