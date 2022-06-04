/*!
 * Copyright (c) 2017-2022 Digital Bazaar, Inc. All rights reserved.
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
      // FIXME: Remove if not used
      // handle,
      // FIXME: Remove if not used
      // iframe,
      popup = true,
      // FIXME: Remove if not used
      // windowControl,
      className = null,
      customize = null
    } = {}) {
    this.visible = false;
    this.dialog = null;
    this.iframe = null;
    this.handle = null;
    this.popup = popup;
    this.windowControl = null;
    this._destroyed = false;
    this._ready = false;
    this._private = {};
    this._timeoutId = null;

    console.trace('here')
    console.log('create new web app window')
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

    // FIXME: Remove if not used
    // if(iframe) {
    //   // TODO: validate `iframe` option as much as possible
    //   if(!(typeof iframe === 'object' && iframe.contentWindow)) {
    //     throw new TypeError('`options.iframe` must be an iframe element.');
    //   }
    //   this.windowControl = {
    //     handle: iframe.contentWindow,
    //     show() {
    //       iframe.style.visibility = 'visible';
    //     },
    //     hide() {
    //       iframe.style.visibility = 'hidden';
    //     }
    //   };
    //   this.iframe = iframe;
    //   this.handle = this.iframe.contentWindow;
    //   return;
    // }

    // FIXME: Remove if not used
    // if(windowControl) {
    //   // TODO: validate `windowControl`
    //   this.windowControl = windowControl;
    //   this.handle = this.windowControl.handle;
    //   return;
    // }

    // FIXME: Remove if not used
    // if(handle) {
    //   // TODO: validate `handle`
    //   this.handle = handle;
    //   return;
    // }

    if(customize) {
      if(!typeof customize === 'function') {
        throw new TypeError('`options.customize` must be a function.');
      }
    }

    if(this.popup) {
      this.dialog = new WebAppWindowPopupDialog({url});
    } else {
      alert('why am i here')
      console.log('create inline dialog')
      this.dialog = new WebAppWindowInlineDialog({url, customize, className});
    }

    this.handle = this.dialog.handle;
    console.log(this.handle);
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
    console.log('show WebAppWindow.js')
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
