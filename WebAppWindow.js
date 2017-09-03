/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import dialogPolyfill from 'dialog-polyfill';

// default time out is 10 seconds
const LOAD_WINDOW_TIMEOUT = 10000;

/**
 * Provides a window and API for remote Web applications. This API is typically
 * used by RPC WebApps that run in a WebAppContext to indicate when they are
 * ready and to show/hide their UI.
 */
export class WebAppWindow {
  constructor(
    url, {
      timeout = LOAD_WINDOW_TIMEOUT,
      handle,
      iframe,
      windowControl,
      className = null,
      customize = null
    } = {}) {
    const self = this;

    self.visible = false;
    self.dialog = null;
    self.iframe = null;
    self.handle = null;
    self.windowControl = null;
    self._ready = false;
    self._private = {};

    // private to allow caller to track readiness
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
      if(self.dialog) {
        self.dialog.parentNode.removeChild(self.dialog);
        self.dialog = null;
      }
    };

    if(iframe) {
      // TODO: validate `iframe` option as much as possible
      if(!(typeof iframe === 'object' && iframe.contentWindow)) {
        throw new TypeError('`options.iframe` must be an iframe element.');
      }
      self.windowControl = {
        handle: iframe.contentWindow,
        show() {
          iframe.style.visibility = 'visible';
        },
        hide() {
          iframe.style.visibility = 'hidden';
        }
      };
      self.iframe = iframe;
      self.handle = self.iframe.contentWindow;
      return;
    }

    if(windowControl) {
      // TODO: validate `windowControl`
      self.windowControl = windowControl;
      self.handle = self.windowControl.handle;
      return;
    }

    if(handle) {
      // TODO: validate `handle`
      self.handle = handle;
      return;
    }

    if(customize) {
      if(!typeof customize === 'function') {
        throw new TypeError('`options.customize` must be a function.');
      }
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
    self.dialog.className = 'web-app-window';
    if(typeof className === 'string') {
      self.dialog.className = self.dialog.className + ' ' + className;
    }

    // ensure backdrop is transparent by default
    const style = document.createElement('style');
    style.appendChild(
      document.createTextNode(`dialog.web-app-window::backdrop {
        background-color: transparent;
      }`));

    // create flex container for iframe
    self.container = document.createElement('div');
    applyStyle(self.container, {
      position: 'relative',
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      display: 'flex',
      'flex-direction': 'column'
    });

    // create iframe
    self.iframe = document.createElement('iframe');
    self.iframe.src = url;
    self.iframe.scrolling = 'no';
    applyStyle(self.iframe, {
      position: 'relative',
      border: 'none',
      background: 'transparent',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      'flex-grow': 1,
      width: '100%',
      height: '100%'
    });

    // assemble dialog
    self.dialog.appendChild(style);
    self.container.appendChild(self.iframe);
    self.dialog.appendChild(self.container);

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
      dialogPolyfill.registerDialog(self.dialog);
    }

    if(customize) {
      try {
        customize({
          dialog: self.dialog,
          container: self.container,
          iframe: self.iframe,
          webAppWindow: self
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
      if(this.dialog) {
        this.dialog.style.display = 'block';
        this.dialog.showModal();
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
      if(this.dialog) {
        this.dialog.style.display = 'none';
        if(this.dialog.close) {
          try {
            this.dialog.close();
          } catch(e) {
            console.error(e);
          }
        }
      } else if(this.windowControl.hide) {
        this.windowControl.hide();
      }
    }
  }
}

function applyStyle(element, style) {
  for(let name in style) {
    element.style[name] = style[name];
  }
}
