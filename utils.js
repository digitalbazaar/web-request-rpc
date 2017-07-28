/*!
 * Utilities for Web Request RPC.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

export const RPC_ERRORS = {
  ParseError: {
    message: 'Parse error',
    code: -32700
  },
  InvalidRequest: {
    message: 'Invalid Request',
    code: -32600
  },
  MethodNotFound: {
    message: 'Method not found',
    code: -32601
  },
  InvalidParams: {
    message: 'Invalid params',
    code: -32602
  },
  InternalError: {
    message: 'Internal Error',
    code: -32603
  },
  ServerError: {
    message: 'Server error',
    code: -32000
  }
};

export function parseOrigin(url) {
  // `URL` API not supported on IE, use DOM to parse URL
  var parser = document.createElement('a');
  parser.href = url;
  var origin = (parser.protocol || window.location.protocol) + '//';
  if(parser.host) {
    // use hostname when using default ports
    // (IE adds always adds port to `parser.host`)
    if((parser.protocol === 'http:' && parser.port === '80') ||
      (parser.protocol === 'https:' && parser.port === '443')) {
      origin += parser.hostname;
    } else {
      origin += parser.host;
    }
  } else {
    origin += window.location.host;
  }
  return origin;
}

// https://gist.github.com/LeverOne/1308368
export function uuidv4(a,b) {
  for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;
}

export function isValidMessage(message) {
  return (
    message && typeof message === 'object' &&
    message.jsonrpc === '2.0' &&
    message.id && typeof message.id === 'string');
}

export function isValidRequest(message) {
  return isValidMessage(message) && Array.isArray(message.params);
}

export function isValidResponse(message) {
  return (
    isValidMessage(message) &&
    ('result' in message ^ 'error' in message) &&
    (!('error' in message) || isValidError(message.error)));
}

export function isValidError(error) {
  return (
    error && typeof error === 'object' &&
    typeof error.code === 'number' &&
    typeof error.message === 'string');
}

export function serializeError(error) {
  const err = {message: error.message};
  if(!('code' in error)) {
    err.code = RPC_ERRORS.ServerError.code;
  }
  return err;
}

export function deserializeError(error) {
  const err = new Error(error.message);
  err.code = err.code;
  if(error.details) {
    err.details = error.details;
  }
  return err;
}

export function createMessageListener(
  {listener, origin, handle, expectRequest}) {
  return e => {
    // ignore messages from a non-matching handle or origin
    // or that don't follow the protocol
    if(!(e.source === handle && e.origin === origin &&
      ((expectRequest && isValidRequest(e.data)) ||
        (!expectRequest && isValidResponse(e.data))))) {
      return;
    }
    listener(e.data, e);
  };
}

export function destructureMethodName(fqMethodName) {
  // fully-qualified method name is: `<api-name>.<method-name>`
  // where `<api-name>` is all but the last dot-delimited segment and
  // `<method-name>` is the last dot-delimited segment
  let [name, ...rest] = fqMethodName.split('.');
  const method = rest.pop();
  name = [name, ...rest].join('.');
  return {name, method};
}
