/**
 * Minimal publish/subscribe event bus.
 * This is prepared for future use only — it is not yet
 * integrated into any manager or system.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribes a callback to an event.
   * @param {string} event - Event name.
   * @param {Function} callback - Called with the event payload when emitted.
   */
  subscribe(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  /**
   * Unsubscribes a callback from an event.
   * @param {string} event - Event name.
   * @param {Function} callback - Callback previously passed to subscribe().
   */
  unsubscribe(event, callback) {
    this._listeners.get(event)?.delete(callback);
  }

  /**
   * Emits an event, calling every subscribed callback with the payload.
   * @param {string} event - Event name.
   * @param {*} [payload] - Optional data passed to each callback.
   */
  emit(event, payload) {
    this._listeners.get(event)?.forEach((callback) => callback(payload));
  }
}
