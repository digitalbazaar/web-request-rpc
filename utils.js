/*!
 * Utilities for Web Request RPC.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

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
    message.id && typeof message.id === 'string' &&
    ('result' in message ^ 'error' in message) &&
    (!('error' in message) || isValidError(message.error)));
}

export function isValidError(error) {
  return (
    error && typeof error === 'object' &&
    typeof error.code === 'number' &&
    typeof error.message === 'string');
}

export function createError(error) {
  const err = new Error(error.message);
  err.code = err.code;
  if(error.details) {
    err.details = error.details;
  }
  return err;
}
