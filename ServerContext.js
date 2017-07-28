/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global dialogPolyfill */
'use strict';

import {Client} from './Client';
import {Server} from './Server';
import {parseOrigin} from './utils';

// 10 seconds
const SERVER_CONTEXT_LOAD_TIMEOUT = 10000;

export class ServerContext {
  constructor() {
    this.client = new Client();
    this.server = new Server();
    this.injector = null;
    this.control = null;
    this.loaded = false;
  }

  /**
   * Creates a window (or attaches to an existing one) that loads a page that
   * is expected to understand the web request RPC protocol. This method
   * returns a Promise that will resolve once the page uses RPC to indicate
   * that it is ready to be communicated with or once a timeout occurs.
   *
   * The Promise will resolve to an RPC injector that can be used to get or
   * define APIs to enable communication with the server running in the
   * server context.
   *
   * @param url the URL to the page to connect to.
   * @param options the options to use:
   *          [iframe] a handle to an iframe to connect to.
   *          [className] a className to assign to the window for CSS purposes.
   *
   * @return a Promise that resolves to an RPC injector once the window is
   *           ready.
   */
  async createWindow(url, options) {
    options = options || {};

    // disallow loading the same server context more than once
    if(this.loaded) {
      throw new Error('ServerContext already loaded.');
    }
    this.loaded = true;

    // create control API for server to call via its own RPC client
    this.control = new Control(url, options);

    // define control class; this enables the server that is running in the
    // ServerContext to control its UI or close itself down
    this.server.define('core.control', this.control);

    // listen for calls from the window, ignoring calls to unknown APIs
    // to allow those to be handled by other servers
    const origin = parseOrigin(url);
    this.server.listen(origin, {
      handle: this.control.handle,
      ignoreUnknownApi: true
    });

    // wait for control to be ready
    await this.control._private.isReady();

    // connect to the server context and return the injector
    this.injector = await this.client.connect(origin, {
      handle: this.control.handle
    });
    return this.injector;
  }

  close() {
    this.control._private.destroy();
    this.server.close();
    this.client.close();
  }
}

/**
 * Provides an API for RPC servers that run in a ServerContext to indicate
 * when they are ready and to show/hide their UI.
 */
class Control {
  constructor(url, options) {
    const self = this;

    self.visible = false;
    self.dialog = null;
    self.iframe = null;
    self.handle = null;
    self._ready = false;
    self._private = {};

    if(options.iframe) {
      // TODO: validate `iframe` option as much as possible
      if(!(typeof options.iframe === 'object' &&
        options.iframe.contentWindow)) {
        throw new TypeError('`options.iframe` must be an iframe element.');
      }
      self.iframe = options.iframe;
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
    if('className' in options) {
      self.dialog.className = options.className;
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

    // private to allow ServerContext to track readiness
    self._private._readyPromise = new Promise((resolve, reject) => {
      // reject if timeout reached
      const timeoutId = setTimeout(
        () => reject(new Error('ServerContext timed out.')),
        SERVER_CONTEXT_LOAD_TIMEOUT);
      self._private._resolveReady = value => {
        clearTimeout(timeoutId);
        resolve(value);
      };
    });
    self._private.isReady = async () => {
      return self._private._readyPromise;
    };

    // private to disallow destruction via server
    self._private.destroy = () => {
      self.dialog.parentNode.removeChild(self.dialog);
      self.dialog = null;
    };
  }

  /**
   * Called by the server's RPC client when it is ready to receive messages.
   */
  ready() {
    this._ready = true;
    this._private._resolveReady(true);
  }

  /**
   * Called by the server's RPC client when it wants to show UI.
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
   * Called by the server's RPC client when it wants to hide UI.
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
