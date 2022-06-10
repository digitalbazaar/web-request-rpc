/*!
 * Copyright (c) 2017-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {Client} from './Client.js';
import {Server} from './Server.js';
import {WebAppWindow} from './WebAppWindow.js';
import {parseUrl} from './utils.js';

// 10 seconds
const WEB_APP_CONTEXT_LOAD_TIMEOUT = 10000;

export class WebAppContext {
  constructor() {
    this.client = new Client();
    this.server = new Server();
    this.injector = null;
    this.control = null;
    this.loaded = false;
    this.closed = false;
  }

  /**
   * Creates a window (or attaches to an existing one) that loads a page that
   * is expected to understand the web request RPC protocol. This method
   * returns a Promise that will resolve once the page uses RPC to indicate
   * that it is ready to be communicated with or once a timeout occurs.
   *
   * The Promise will resolve to an RPC injector that can be used to get or
   * define APIs to enable communication with the WebApp running in the
   * WebAppContext.
   *
   * @param url the URL to the page to connect to.
   * @param options the options to use:
   *          [timeout] the timeout for waiting for the client to be ready.
   *          [handle] a window handle to connect to; may be a Promise that
   *            that resolves to a handle.
   *          [iframe] an iframe element to connect to.
   *          [windowControl] a window control interface to connect to.
   *          [className] a className to assign to the window for CSS purposes.
   *          [customize(options)] a function to customize the dialog that
   *            loads the window after its construction.
   *          [bounds] a bounding rectangle (top, left, width, height) to
   *            use when creating a popup window.
   *
   * @return a Promise that resolves to an RPC injector once the window is
   *           ready.
   */
  async createWindow(
    url, {
      timeout = WEB_APP_CONTEXT_LOAD_TIMEOUT,
      iframe,
      dialog = null,
      popup = false,
      handle,
      windowControl,
      className,
      customize,
      // top, left, width, height
      bounds
    } = {}) {
    // disallow loading the same WebAppContext more than once
    if(this.loaded) {
      throw new Error('AppContext already loaded.');
    }
    this.loaded = true;

    // create control API for WebApp to call via its own RPC client
    this.control = new WebAppWindow(url, {
      timeout,
      dialog,
      iframe,
      popup,
      handle,
      windowControl,
      className,
      customize,
      bounds
    });

    // if the local window closes, close the control window as well
    window.addEventListener('pagehide', () => this.close(), {once: true});

    // define control class; this enables the WebApp that is running in the
    // WebAppContext to control its UI or close itself down
    this.server.define('core.control', this.control);

    // listen for calls from the window, ignoring calls to unknown APIs
    // to allow those to be handled by other servers
    const origin = parseUrl(url).origin;
    this.server.listen(origin, {
      handle: this.control.handle,
      ignoreUnknownApi: true
    });

    // wait for control to be ready
    await this.control._private.isReady();

    // connect to the WebAppContext and return the injector
    this.injector = await this.client.connect(origin, {
      handle: this.control.handle
    });
    return this.injector;
  }

  close() {
    if(!this.closed) {
      this.closed = true;
      this.control._private.destroy();
      this.server.close();
      this.client.close();
    }
  }
}
