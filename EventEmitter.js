/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

export class EventEmitter {
  constructor({deserialize = e => e, waitUntil = async () => {}} = {}) {
    this._listeners = [];
    this._deserialize = deserialize;
    this._waitUntil = waitUntil;
  }

  async emit(event) {
    event = this._deserialize(event);
    (this._listeners[event.type] || []).forEach(l => l(event));
    return this._waitUntil(event);
  }

  addEventListener(eventType, fn) {
    if(!this._listeners[eventType]) {
      this._listeners[eventType] = [fn];
    } else {
      this._listeners[eventType].push(fn);
    }
  }

  removeEventListener(eventType, fn) {
    const listeners = this._listeners[eventType];
    if(!listeners) {
      return;
    }
    const idx = listeners.indexOf(fn);
    if(idx !== -1) {
      listeners.splice(idx, 1);
    }
  }
}
