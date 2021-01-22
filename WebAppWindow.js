/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

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
      handle,
      iframe,
      windowControl,
      className = null,
      customize = null
    } = {}) {
    this.visible = false;
    this.dialog = null;
    this.iframe = null;
    this.handle = null;
    this.windowControl = null;
    this._ready = false;
    this._private = {};
    this._timeoutId = null;

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
      if(this.dialog) {
        this.dialog.parentNode.removeChild(this.dialog);
        this.dialog = null;
      }
    };

    if(iframe) {
      // TODO: validate `iframe` option as much as possible
      if(!(typeof iframe === 'object' && iframe.contentWindow)) {
        throw new TypeError('`options.iframe` must be an iframe element.');
      }
      this.windowControl = {
        handle: iframe.contentWindow,
        show() {
          iframe.style.visibility = 'visible';
        },
        hide() {
          iframe.style.visibility = 'hidden';
        }
      };
      this.iframe = iframe;
      this.handle = this.iframe.contentWindow;
      return;
    }

    if(windowControl) {
      // TODO: validate `windowControl`
      this.windowControl = windowControl;
      this.handle = this.windowControl.handle;
      return;
    }

    if(handle) {
      // TODO: validate `handle`
      this.handle = handle;
      return;
    }

    if(customize) {
      if(!typeof customize === 'function') {
        throw new TypeError('`options.customize` must be a function.');
      }
    }

    // create a top-level dialog overlay
    this.dialog = document.createElement('dialog');
    applyStyle(this.dialog, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      max-width: '100%',
      max-height: '100%',
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
    this.dialog.className = 'web-app-window';
    if(typeof className === 'string') {
      this.dialog.className = this.dialog.className + ' ' + className;
    }

    // ensure backdrop is transparent by default
    const style = document.createElement('style');
    style.appendChild(
      document.createTextNode(`dialog.web-app-window::backdrop {
        background-color: transparent;
      }`));

    // create flex container for iframe
    this.container = document.createElement('div');
    applyStyle(this.container, {
      position: 'relative',
      width: '100%',
      height: '100%',
      margin: 0,
      padding: 0,
      display: 'flex',
      'flex-direction': 'column'
    });
    this.container.className = 'web-app-window-backdrop';

    // create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = url;
    this.iframe.scrolling = 'auto';
    applyStyle(this.iframe, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'none',
      background: 'transparent',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      'flex-grow': 1
    });

    // assemble dialog
    this.dialog.appendChild(style);
    this.container.appendChild(this.iframe);
    this.dialog.appendChild(this.container);

    // handle cancel (user pressed escape)
    this.dialog.addEventListener('cancel', e => {
      e.preventDefault();
      this.hide();
    });

    // attach to DOM
    document.body.appendChild(this.dialog);
    this.handle = this.iframe.contentWindow;

    if(customize) {
      try {
        customize({
          dialog: this.dialog,
          container: this.container,
          iframe: this.iframe,
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
      if(this.dialog) {
        this.dialog.style.display = 'block';
        if(this.dialog.showModal) {
          this.dialog.showModal();
        }
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
  for(const name in style) {
    element.style[name] = style[name];
  }
}
