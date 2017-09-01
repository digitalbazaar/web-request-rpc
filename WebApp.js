/*!
 * A WebApp is a remote application that runs in a WebAppContext.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {Client} from './Client.js';
import {Server} from './Server.js';
import {parseUrl} from './utils.js';

export class WebApp {
  constructor(relyingOrigin) {
    // this is the origin that created the WebAppContext to run it in
    // TODO: better name? `contextOrigin`?
    this.relyingOrigin = parseUrl(relyingOrigin).origin;
    this.client = null;
    this.injector = null;
    this.client = new Client();
    this.server = new Server();

    this._control = null;
    this._connected = false;
  }

  /**
   * Connects this WebApp to the relying origin that instantiated it. Once
   * connected, the WebApp can start servicing calls from that origin.
   *
   * @return a Promise that resolves to an injector for creating custom client
   *           APIs once the connection is ready.
   */
  async connect() {
    this.injector = await this.client.connect(this.relyingOrigin);
    this._connected = true;
    this._control = this.injector.define('core.control', {
      functions: ['ready', 'show', 'hide']
    });
    this.server.listen(this.relyingOrigin);
    return this.injector;
  }

  /**
   * Must be called after `connect` when this WebApp is ready to start
   * receiving calls from the remote end.
   */
  async ready() {
    if(!this._connected) {
      throw new Error('WebApp not connected. Did you call ".connect()"?');
    }
    await this._control.ready();
    return this;
  }

  /**
   * Closes this WebApp's connection to the relying origin.
   */
  close() {
    if(this._connected) {
      this.server.close();
      this.client.close();
      this._connected = false;
    }
  }

  /**
   * Shows the UI for this WebApp on the relying origin.
   */
  async show() {
    if(!this._connected) {
      throw new Error(
        'Cannot "show" yet; not connected. Did you call ".connect()"?');
    }
    return this._control.show();
  }

  /**
   * Hides the UI for this WebApp on the relying origin.
   */
  async hide() {
    if(!this._connected) {
      throw new Error(
        'Cannot "hide" yet; not connected. Did you call ".connect()?"');
    }
    return this._control.hide();
  }
}
