/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {WebAppWindowDialog} from './WebAppWindowDialog.js';

export class WebAppWindowPopupDialog extends WebAppWindowDialog {
  constructor({url, handle, width = 500, height = 400}) {
    super();
    this.handle = handle;
    if(!handle) {
      this._openWindow({url, name: 'web-app-window', width, height});
    }
    this.destroyed = false;
  }

  show() {}

  close() {
    this.destroy();
  }

  destroy() {
    if(this.handle && !this.destroyed) {
      this.handle.close();
      this.handle = null;
      this.destroyed = true;
    }
  }

  _openWindow({url, name, width, height}) {
    const left = window.screenX - (width / 2);
    const top = window.screenY - (height / 2);
    const features =
      'menubar=no,location=no,resizable=no,scrollbars=no,status=no,' +
      `width=${width},height=${height},left=${left},top=${top}`;
    this.handle = window.open(url, name, features);

    this.setListeners();
  }

  setLocation(location) {
    this.removeListeners();
    this.handle.location.href = location;
    this.setListeners();
  }

  setListeners() {
    // create the on load handler that will set this.destroyed to true when
    // an unload event comes in
    if(!this._setDestroyedToTrueOnLoadHandler) {
      // store handler function
      this._setDestroyedToTrueOnLoadHandler = () => {
        // create the on unload handler that will set this.destroyed to true, if
        // not already created
        if(!this._setDestroyedToTrue) {
          this._setDestroyedToTrue = () => this.destroyed = true;
        }
        // add the unload handler
        this.handle.addEventListener('unload', this._setDestroyedToTrue,
          {once: true});
      }
    }

    // create the on unload handler that will call this.destroy(), if no
    // already created
    if(!this._destroyUnloadHandler) {
      this._destroyUnloadHandler = () => this.destroy();
    }
    // add the load handler
    this.handle.addEventListener('load', this._setDestroyedToTrueOnLoadHandler,
      {once: true});
    // add the unload handler
    window.addEventListener('unload', this._destroyUnloadHandler, {once: true});
  }

  removeListeners() {
    this.handle.removeEventListener(
      'load', this._setDestroyedToTrueOnLoadHandler, {once: true});
    this.handle.removeEventListener('unload', this._setDestroyedToTrue,
      {once: true});
    window.removeEventListener('unload', this._destroyUnloadHandler,
      {once: true});
  }
}
