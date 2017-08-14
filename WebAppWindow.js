/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global dialogPolyfill */
'use strict';

// default time out is 10 seconds
const LOAD_WINDOW_TIMEOUT = 10000;

/**
 * Provides a window and API for remote Web applications. This API is typically
 * used by RPC WebApps that run in a WebAppContext to indicate when they are
 * ready and to show/hide their UI.
 */
export class WebAppWindow {
  constructor(
    url, {timeout = LOAD_WINDOW_TIMEOUT, iframe, className = null} = {}) {
    const self = this;

    self.visible = false;
    self.dialog = null;
    self.iframe = null;
    self.handle = null;
    self._ready = false;
    self._private = {};

    if(iframe) {
      // TODO: validate `iframe` option as much as possible
      if(!(typeof iframe === 'object' && iframe.contentWindow)) {
        throw new TypeError('`options.iframe` must be an iframe element.');
      }
      self.iframe = iframe;
      self.handle = self.iframe.contentWindow;
      return;
    }

    // create a top-level dialog overlay
    self.dialog = document.createElement('dialog');
    applyStyle(self.dialog, {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 'auto',
      height: 'auto',
      display: 'none',
      margin: 0,
      padding: 0,
      border: 'none',
      background: 'transparent',
      color: 'black',
      'box-sizing': 'border-box',
      overflow: 'hidden',
      'z-index': 1000000
    });
    if(typeof className === 'string') {
      self.dialog.className = className;
    }

    // create iframe
    self.iframe = document.createElement('iframe');
    self.iframe.src = url;
    self.iframe.scrolling = 'no';
    applyStyle(self.iframe, {
      position: 'absolute',
      top: 0,
      left: 0,
      border: 'none',
      background: 'transparent',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    });

    // assemble dialog
    self.dialog.appendChild(self.iframe);

    // handle cancel (user pressed escape)
    self.dialog.addEventListener('cancel', e => {
      e.preventDefault();
      self.hide();
    });

    // attach to DOM
    document.body.appendChild(self.dialog);
    self.handle = self.iframe.contentWindow;

    // register dialog with dialog-polyfill if necessary
    if(!self.dialog.showModal) {
      if(typeof require === 'function' &&
        typeof dialogPolyfill === 'undefined') {
        try {
          dialogPolyfill = require('dialog-polyfill');
        } catch(e) {}
      }
      if(typeof dialogPolyfill !== 'undefined') {
        dialogPolyfill.registerDialog(self.dialog);
      }
    }

    // private to allow WebAppContext to track readiness
    self._private._readyPromise = new Promise((resolve, reject) => {
      // reject if timeout reached
      const timeoutId = setTimeout(
        () => reject(new Error('Loading Web application window timed out.')),
        timeout);
      self._private._resolveReady = value => {
        clearTimeout(timeoutId);
        resolve(value);
      };
    });
    self._private.isReady = async () => {
      return self._private._readyPromise;
    };

    // private to disallow destruction via client
    self._private.destroy = () => {
      self.dialog.parentNode.removeChild(self.dialog);
      self.dialog = null;
    };
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
      if(this.dialog) {
        this.dialog.style.display = 'block';
        this.dialog.showModal();
      } else {
        this.iframe.style.visibility = 'visible';
      }
    }
  }

  /**
   * Called by the client when it wants to hide UI.
   */
  hide() {
    if(this.visible) {
      this.visible = false;
      if(this.dialog) {
        this.dialog.style.display = 'none';
        if(this.dialog.close) {
          try {
            this.dialog.close();
          } catch(e) {
            console.error(e);
          }
        }
      } else {
        this.iframe.style.visibility = 'hidden';
      }
    }
  }
}

function applyStyle(element, style) {
  for(let name in style) {
    element.style[name] = style[name];
  }
}
