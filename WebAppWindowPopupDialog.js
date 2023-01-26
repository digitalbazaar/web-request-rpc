/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {WebAppWindowDialog} from './WebAppWindowDialog.js';

export class WebAppWindowPopupDialog extends WebAppWindowDialog {
  constructor({url, handle, bounds = {width: 500, height: 400}}) {
    super();
    this.url = url;
    this.handle = handle;
    this._locationChanging = false;
    if(!handle) {
      this._openWindow({url, name: 'web-app-window', bounds});
    }
    this.destroyed = false;
    this._removeListeners = () => {};
  }

  show() {}

  close() {
    this.destroy();
  }

  destroy() {
    if(this.handle && !this.destroyed) {
      this.handle.close();
      super.close();
      this.handle = null;
      this.destroyed = true;
      this._removeListeners();
      super.destroy();
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
    const left = Math.floor(x !== undefined ?
      x : window.screenX + (window.innerWidth - width) / 2);
    const top = Math.floor(y !== undefined ?
      y : window.screenY + (window.innerHeight - height) / 2);
    const features =
      'popup=yes,menubar=no,location=no,resizable=no,scrollbars=no,status=no,' +
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
      this._locationChanging = false;
    };

    // when the dialog URL changes...
    const unloadDialog = () => {
      if(this._locationChanging) {
        // a location change was expected, return
        return;
      }

      // a location change was NOT expected, destroy the dialog
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
