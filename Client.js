/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as utils from './utils.js';

// 30 second default timeout
const RPC_CLIENT_CALL_TIMEOUT = 30000;

export class Client {
  constructor() {
    this.origin = null;
    this._handle = null;
    this._listener = null;
    // all pending requests
    this._pending = new Map();
  }

  /**
   * Connects to a Web Request RPC server.
   *
   * The Promise will resolve to an RPC injector that can be used to get or
   * define APIs to enable communication with the server.
   *
   * @param origin the origin to send messages to.
   * @param options the options to use:
   *          [handle] a handle to the window (or a Promise that resolves to
   *            a handle) to send messages to
   *            (defaults to `window.opener || window.parent`).
   *
   * @return a Promise that resolves to an RPC injector once connected.
   */
  async connect(origin, options) {
    if(this._listener) {
      throw new Error('Already connected.');
    }

    options = options || {};

    // TODO: validate `origin` and `options.handle`
    const self = this;
    self.origin = utils.parseUrl(origin).origin;
    self._handle = options.handle || window.opener || window.parent;

    const pending = self._pending;
    self._listener = utils.createMessageListener({
      origin: self.origin,
      handle: self._handle,
      expectRequest: false,
      listener: message => {
        // ignore messages that have no matching, pending request
        if(!pending.has(message.id)) {
          return;
        }

        // resolve or reject Promise associated with message
        const {resolve, reject, cancelTimeout} = pending.get(message.id);
        cancelTimeout();
        if('result' in message) {
          return resolve(message.result);
        }
        reject(utils.deserializeError(message.error));
      }
    });
    window.addEventListener('message', self._listener);

    return new Injector(self);
  }

  /**
   * Performs a RPC by sending a message to the Web Request RPC server and
   * awaiting a response.
   *
   * @param qualifiedMethodName the fully-qualified name of the method to call.
   * @param parameters the parameters for the method.
   * @param options the options to use:
   *          [timeout] a timeout, in milliseconds, for awaiting a response;
   *            a non-positive timeout (<= 0) will cause an indefinite wait.
   *
   * @return a Promise that resolves to the result (or error) of the call.
   */
  async send(qualifiedMethodName, parameters, {
    timeout = RPC_CLIENT_CALL_TIMEOUT
  }) {
    if(!this._listener) {
      throw new Error('RPC client not connected.');
    }

    const self = this;

    const message = {
      jsonrpc: '2.0',
      id: utils.uuidv4(),
      method: qualifiedMethodName,
      params: parameters
    };

    // HACK: we can't just `Promise.resolve(handle)` because Chrome has
    // a bug that throws an exception if the handle is cross domain
    if(utils.isHandlePromise(self._handle)) {
      const handle = await self._handle;
      handle.postMessage(message, self.origin);
    } else {
      self._handle.postMessage(message, self.origin);
    }

    // return Promise that will resolve once a response message has been
    // received or once a timeout occurs
    return new Promise((resolve, reject) => {
      const pending = self._pending;
      let cancelTimeout;
      if(timeout > 0) {
        const timeoutId = setTimeout(() => {
          pending.delete(message.id);
          reject(new Error('RPC call timed out.'));
        }, timeout);
        cancelTimeout = () => {
          pending.delete(message.id);
          clearTimeout(timeoutId);
        };
      } else {
        cancelTimeout = () => {
          pending.delete(message.id);
        };
      }
      pending.set(message.id, {resolve, reject, cancelTimeout});
    });
  }

  /**
   * Disconnects from the remote Web Request RPC server and closes down this
   * client.
   */
  close() {
    if(this._listener) {
      window.removeEventListener('message', this._listener);
      this._handle = this.origin = this._listener = null;
      // reject all pending calls
      for(const value of this._pending.values()) {
        value.reject(new Error('RPC client closed.'));
      }
      this._pending = new Map();
    }
  }
}

class Injector {
  constructor(client) {
    this.client = client;
    this._apis = new Map();
  }

  /**
   * Defines a named API that will use an RPC client to implement its
   * functions. Each of these functions will be asynchronous and return a
   * Promise with the result from the RPC server.
   *
   * This function will return an interface with functions defined according
   * to those provided in the given `definition`. The `name` parameter can be
   * used to obtain this cached interface via `.get(name)`.
   *
   * @param name the name of the API.
   * @param definition the definition for the API, including:
   *          functions: an array of function names (as strings) or objects
   *            containing: {name: <functionName>, options: <rpcClientOptions>}.
   *
   * @return an interface with the functions provided via `definition` that
   *           will make RPC calls to an RPC server to provide their
   *           implementation.
   */
  define(name, definition) {
    if(!(name && typeof name === 'string')) {
      throw new TypeError('`name` must be a non-empty string.');
    }
    // TODO: support Web IDL as a definition format?
    if(!(definition && typeof definition === 'object' &&
      Array.isArray(definition.functions))) {
      throw new TypeError(
        '`definition.function` must be an array of function names or ' +
        'function definition objects to be defined.');
    }

    const self = this;
    const api = {};

    definition.functions.forEach(fn => {
      if(typeof fn === 'string') {
        fn = {name: fn, options: {}};
      }
      api[fn.name] = async function() {
        return self.client.send(
          name + '.' + fn.name, [...arguments], fn.options);
      };
    });

    self._apis[name] = api;
    return api;
  }

  /**
   * Get a named API, defining it if necessary when a definition is provided.
   *
   * @param name the name of the API.
   * @param [definition] the definition for the API; if the API is already
   *          defined, this definition is ignored.
   *
   * @return the interface.
   */
  get(name, definition) {
    const api = this._apis[name];
    if(!api) {
      if(definition) {
        return this.define(name, definition);
      }
      throw new Error(`API "${name}" has not been defined.`);
    }
    return this._apis[name];
  }
}
