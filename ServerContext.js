/*!
 * A ServerContext is a window that loads a page that runs an RPC server
 * and an RPC client that can make some control calls, such as to show
 * or hide its UI.
 *
 * A ServerContext is used to run and provide access to a Web application that
 * runs on a cross domain website. Use cases include:
 *
 * 1. Loading and communicating with a "Web Request Mediator" that polyfills
 *   some missing feature in a user's Web browser that could not be polyfilled
 *   without the use of a cross-domain third party website. These features
 *   are typically modeled as some kind of request made by one website that
 *   will be fulfilled by a different website. The mediator plays the role
 *   that the browser would natively provide if it implemented the feature,
 *   namely to facilitate communication and interaction between these two sites
 *   to process and fulfill the request.
 *
 * 2. Loading and communicating with a third party service provider Web
 *   application. A "Web Request Mediator" (see the first use case) would use
 *   a ServerContext to load these Web applications to enable them to fulfill
 *   requests made by a relying party.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global dialogPolyfill */
'use strict';

import Client from './Client';
import Server from './Server';
import {parseOrigin} from './utils';

export default class ServerContext {
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

    // create control for server
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

    // connect to the server context and return the injector
    this.injector = await this.client.connect(url, {
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

class Control {
  constructor(url, options) {
    const self = this;

    self.visible = false;
    self.dialog = null;
    self.iframe = null;
    self.handle = null;
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
      display: 'block',
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

    // private to disallow destruction via server
    self._private.destroy = () => {
      self.dialog.parentNode.removeChild(self.dialog);
      self.dialog = null;
    };
  }

  show() {
    if(!self.visible) {
      self.visible = true;
      if(self.dialog) {
        self.dialog.showModal();
      } else {
        self.iframe.style.visibility = true;
      }
    }
  }


  hide() {
    if(self.visible) {
      self.visible = false;
      if(self.dialog) {
        if(self.dialog.close) {
          try {
            self.dialog.close();
          } catch(e) {
            console.error(e);
          }
        }
      } else {
        self.iframe.style.visibility = false;
      }
    }
  }
}

function applyStyle(element, style) {
  for(let name in style) {
    element.style[name] = style[name];
  }
}
