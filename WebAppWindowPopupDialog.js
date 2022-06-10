/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {WebAppWindowDialog} from './WebAppWindowDialog.js';

export class WebAppWindowPopupDialog extends WebAppWindowDialog {
  constructor({url, handle, bounds = {width: 500, height: 400}}) {
    super();
    this.url = url;
    // FIXME: do not reuse handle, reuse entire dialog class instead
    this.handle = handle;
    this._locationChanging = false;
    if(!handle) {
      this._openWindow({url, name: 'web-app-window', bounds});
    }
    this.destroyed = false;
    this._removeListeners = () => {};

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
    console.log('close called on popup dialog');
    this.destroy();
  }

  destroy() {
    console.log('destroy called on popup dialog');
    if(this.handle && !this.destroyed) {
      this.handle.close();
      this.handle = null;
      this.destroyed = true;
      this._removeListeners();
      // emit event to all `close` event listeners
      for(const listener of this._closeEventListeners) {
        listener({});
      }
      this._closeEventListeners.clear();
    }
  }

  isClosed() {
    return !this.handle || this.handle.closed;
  }

  _openWindow({url, name, bounds}) {
    const {x, y} = bounds;
    let {width = 500, height = 400} = bounds;
    width = Math.min(width, window.innerWidth);
    height = Math.min(height, window.innerHeight);
    const left = x !== undefined ?
      x : window.screenX + (window.innerWidth - width) / 2;
    const top = y !== undefined ?
      y : window.screenY + (window.innerHeight - height) / 2;
    const features =
      'menubar=no,location=no,resizable=no,scrollbars=no,status=no,' +
      `width=${width},height=${height},left=${left},top=${top}`;
    this._locationChanging = true;
    this.handle = window.open(url, name, features);

    this._addListeners();
  }

  setLocation(url) {
    this.url = url;
    this._locationChanging = true;
    this.handle.location.replace(url);
  }

  _addListeners() {
    const destroyDialog = () => this.destroy();

    // when a new URL loads in the dialog, clear the location changing flag
    const loadDialog = () => {
      console.log('dialog loaded, clearing location changing flag');
      this._locationChanging = false;
    };

    // when the dialog URL changes...
    const unloadDialog = () => {
      if(this._locationChanging) {
        // a location change was expected, return
        console.log('dialog unloaded but expected a location change');
        return;
      }

      // a location change was NOT expected, destroy the dialog
      console.log('dialog unloaded and NOT expected, destroying dialog');
      this.destroy();
    };

    this.handle.addEventListener('unload', unloadDialog);
    this.handle.addEventListener('load', loadDialog);

    // before the current window unloads, destroy the child dialog
    window.addEventListener('beforeUnload', destroyDialog, {once: true});

    // poll to check for closed window handle; necessary because cross domain
    // windows will not emit any close-related events we can use here
    const intervalId = setInterval(() => {
      if(this.isClosed()) {
        this.destroy();
        clearInterval(intervalId);
      }
    }, 250);

    // create listener clean up function
    this._removeListeners = () => {
      clearInterval(intervalId);
      this.handle.removeListener('unload', unloadDialog);
      this.handle.removeListener('load', loadDialog);
      window.removeEventListener('beforeUnload', destroyDialog);
    }
  }
}
