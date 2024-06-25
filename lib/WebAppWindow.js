/*!
 * Copyright (c) 2017-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {WebAppWindowInlineDialog} from './WebAppWindowInlineDialog.js';
import {WebAppWindowPopupDialog} from './WebAppWindowPopupDialog.js';

// default timeout is 60 seconds
const LOAD_WINDOW_TIMEOUT = 60000;

/**
 * Provides a window and API for remote Web applications. This API is typically
 * used by RPC WebApps that run in a WebAppContext to indicate when they are
 * ready and to show/hide their UI.
 */
export class WebAppWindow {
  constructor(
    url, {
      timeout = LOAD_WINDOW_TIMEOUT,
      dialog = null,
      handle,
      popup = false,
      className = null,
      customize = null,
      // top, left, width, height
      bounds
    } = {}) {
    this.visible = false;
    this.dialog = dialog;
    this.handle = null;
    this.popup = popup;
    this.windowControl = null;
    this._destroyed = false;
    this._ready = false;
    this._private = {};
    this._timeoutId = null;

    if(handle && handle._dialog) {
      this.dialog = dialog = handle._dialog;
    }
    // private to allow caller to track readiness
    this._private._readyPromise = new Promise((resolve, reject) => {
      // reject if timeout reached
      this._timeoutId = setTimeout(
        () => reject(new DOMException(
          'Loading Web application window timed out.', 'TimeoutError')),
        timeout);
      this._private._resolveReady = value => {
        clearTimeout(this.timeoutId);
        this._timeoutId = null;
        resolve(value);
      };
      this._private._rejectReady = err => {
        clearTimeout(this.timeoutId);
        this._timeoutId = null;
        reject(err);
      };
    });
    this._private.isReady = async () => {
      return this._private._readyPromise;
    };

    // private to disallow destruction via client
    this._private.destroy = () => {
      // window not ready yet, but destroyed
      if(this._timeoutId) {
        this._private._rejectReady(new DOMException(
          'Web application window closed before ready.', 'AbortError'));
      }
      if(!this._destroyed) {
        this.dialog.destroy();
        this.dialog = null;
        this._destroyed = true;
      }
    };

    if(customize) {
      if(!typeof customize === 'function') {
        throw new TypeError('`options.customize` must be a function.');
      }
    }

    if(!this.dialog) {
      if(this.popup) {
        this.dialog = new WebAppWindowPopupDialog({url, handle, bounds});
      } else {
        this.dialog = new WebAppWindowInlineDialog({url, handle, className});
      }
    }
    if(this.popup && bounds) {
      // resize / re-position popup window as requested
      let {x, y, width = 500, height = 400} = bounds;
      width = Math.min(width, window.innerWidth);
      // ~30 pixels must be added when resizing for window titlebar
      height = Math.min(height + 30, window.innerHeight);
      x = Math.floor(x !== undefined ?
        x : window.screenX + (window.innerWidth - width) / 2);
      // ~15 pixels must be added to account for window titlebar
      y = Math.floor(y !== undefined ?
        y : window.screenY + (window.innerHeight - height) / 2 + 15);
      this.dialog.handle.resizeTo(width, height);
      this.dialog.handle.moveTo(x, y);
    }

    this.handle = this.dialog.handle;
    if(customize) {
      try {
        customize({
          dialog: this.dialog.dialog,
          container: this.dialog.container,
          iframe: this.dialog.iframe,
          webAppWindow: this
        });
      } catch(e) {
        console.error(e);
      }
    }
  }

  /**
   * Called by the client when it is ready to receive messages.
   */
  ready() {
    this._ready = true;
    this._private._resolveReady(true);
  }

  /**
   * Called by the client when it wants to show UI.
   */
  show() {
    if(!this.visible) {
      this.visible = true;
      // disable scrolling on body
      const body = document.querySelector('body');
      this._bodyOverflowStyle = body.style.overflow;
      body.style.overflow = 'hidden';
      if(!this._destroyed) {
        this.dialog.show();
      } else if(this.windowControl.show) {
        this.windowControl.show();
      }
    }
  }

  /**
   * Called by the client when it wants to hide UI.
   */
  hide() {
    if(this.visible) {
      this.visible = false;
      // restore `overflow` style on body
      const body = document.querySelector('body');
      if(this._bodyOverflowStyle) {
        body.style.overflow = this._bodyOverflowStyle;
      } else {
        body.style.overflow = '';
      }
      if(!this._destroyed) {
        this.dialog.close();
      } else if(this.windowControl.hide) {
        this.windowControl.hide();
      }
    }
  }
}
