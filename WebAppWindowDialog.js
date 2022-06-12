/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
export class WebAppWindowDialog {
  constructor() {
    this._closeEventListeners = new Set();
  }

  addEventListener(name, listener) {
    if(name !== 'close') {
      throw new Error(`Unknown event "${name}".`);
    }
    if(typeof listener !== 'function') {
      throw new TypeError('"listener" must be a function.');
    }
    this._closeEventListeners.add(listener);
  }

  removeEventListener(name, listener) {
    if(name !== 'close') {
      throw new Error(`Unknown event "${name}".`);
    }
    if(typeof listener !== 'function') {
      throw new TypeError('"listener" must be a function.');
    }
    this._closeEventListeners.delete(listener);
  }

  show() {}

  close() {
    // emit event to all `close` event listeners
    for(const listener of this._closeEventListeners) {
      listener({});
    }
  }

  destroy() {
    this._closeEventListeners.clear();
  }
}
