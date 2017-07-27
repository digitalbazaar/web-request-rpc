/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {parseOrigin} from './utils';

export default class Server {
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
   *          [handle] a handle to the window to listen for (defaults to
   *            (window.opener || window.top)).
   *          [ignoreUnknownApi] `true` to ignore unknown API messages.
   */
  async listen(origin, options) {
    options = options || {};
    // TODO:
  }

  close() {
    // TODO:
  }
}
