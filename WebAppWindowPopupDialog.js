/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {WebAppWindowDialog} from './WebAppWindowDialog.js';

export class WebAppWindowPopupDialog extends WebAppWindowDialog {
  constructor({url, handle}) {
    super();
    this.handle = handle;
    if(!handle) {
      this._openWindow({url, name: 'web-app-window'});
    }
    this.destroyed = false;
  }

  show() {}

  close() {
    this.destroy();
  }

  destroy() {
    if(this.handle && !this.destroyed) {
      this.handle.close();
      this.handle = null;
      this.destroyed = true;
    }
  }

  _openWindow({url, name}) {
    console.log('open window', {url, name})

    const width = 500;
    const height = 120;
    const left = window.screenX - (width / 2);
    const top = window.screenY - (height / 2);
    const features =
      'menubar=no,location=no,resizable=no,scrollbars=no,status=no,' +
      `width=${width},height=${height},left=${left},top=${top}`;
    this.handle = window.open(url, name, features);

    this.handle.addEventListener('load', () => {
      this.handle.addEventListener('unload', () => {
        this.destroyed = true;
      }, {once: true});
    }, {once: true});

    window.addEventListener('unload', () => this.destroy(), {once: true});
  }
}
