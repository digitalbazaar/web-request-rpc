/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {parseOrigin} from './utils';

export default class Client {
  /**
   * Connects to a Web Request RPC server.
   *
   * The Promise will resolve to an RPC injector that can be used to get or
   * define APIs to enable communication with the server.
   *
   * @param url the URL to the page to connect to.
   * @param options the options to use:
   *          [handle] a handle to the window to connect to.
   *
   * @return a Promise that resolves to an RPC injector once connected.
   */
  async connect(url, options) {
    options = options || {};
    // TODO:
  }

  close() {
    // TODO:
  }
}
