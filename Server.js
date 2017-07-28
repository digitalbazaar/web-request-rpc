/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as utils from './utils';

export default class Server {
  constructor() {
    this.origin = null;
    this.handle = null;
    this._apis = new Map();
  }

  /**
   * Provides an implementation for a named API. All functions in the given
   * API will be made callable via RPC clients connected to this server.
   *
   * @param name the name of the API.
   * @param api the API to add.
   */
  define(name, api) {
    if(!(name && typeof name === 'string')) {
      throw new TypeError('`name` must be a non-empty string.');
    }
    if(!(api && api !== 'object')) {
      throw new TypeError('`api` must be an object.');
    }
    if(name in this._apis) {
      throw new Error(`The "${name}" API is already defined.`);
    }

    this._apis[name] = api;
  }

  /**
   * Listens for RPC messages from clients from a particular origin and
   * window handle and uses them to execute API calls based on predefined
   * APIs.
   *
   * If messages are not from the given origin or window handle, they are
   * ignored. If the messages refer to named APIs that have not been defined
   * then an error message is sent in response. These error messages can
   * be suppressed by using the `ignoreUnknownApi` option.
   *
   * If a message refers to an unknown method on a known named API, then an
   * error message is sent in response.
   *
   * @param origin the origin to listen for.
   * @param options the options to use:
   *          [handle] a handle to the window to listen for messages from
   *            (defaults to `window.opener || window.top`).
   *          [ignoreUnknownApi] `true` to ignore unknown API messages.
   */
  async listen(origin, options) {
    if(this._listener) {
      throw new Error('Already listening.');
    }

    options = options || {};

    // TODO: validate `origin` and `options.handle`
    const self = this;
    self.origin = utils.parseOrigin(origin);
    self.handle = options.handle || (window.opener || window.top);

    const ignoreUnknownApi = (options.ignoreUnknownApi === 'true') || false;

    self._listener = utils.createMessageListener({
      origin: self.origin,
      handle: self.handle,
      expectRequest: true,
      listener: message => {
        const {name, method} = utils.destructureMethodName(message.method);
        const api = self._apis[name];

        // API not found but ignore flag is on
        if(!api && ignoreUnknownApi) {
          // API not registered, ignore the message rather than raise error
          return;
        }

        // no ignore flag and unknown API or unknown specific method
        if(!api || typeof api[method] !== 'function') {
          const response = {
            jsonrpc: '2.0',
            id: message.id,
            error: Object.assign({}, utils.RPC_ERRORS.MethodNotFound)
          };
          return self.handle.postMessage(response, self.origin);
        }

        // API and specific function found
        const fn = api[method];
        (async () => {
          const response = {
            jsonrpc: '2.0',
            id: message.id
          };
          try {
            message.result = await fn.apply(api, message.params);
          } catch(e) {
            message.error = utils.serializeError(e);
          }
          // if server did not `close` while we waited for a response
          if(self.handle) {
            self.handle.postMessage(response, self.origin);
          }
        })();
      }
    });
  }

  close() {
    if(this._listener) {
      window.removeEventListener('message', this._listener);
      this.handle = this.origin = this._listener = null;
    }
  }
}
