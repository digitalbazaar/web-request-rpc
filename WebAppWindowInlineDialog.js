/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {WebAppWindowDialog} from './WebAppWindowDialog.js';

export class WebAppWindowInlineDialog extends WebAppWindowDialog {
  constructor({url, handle, customize, className}) {
    super();
    this.handle = handle;
    // create a top-level dialog overlay
    this.dialog = document.createElement('dialog');
    applyStyle(this.dialog, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      'max-width': '100%',
      'max-height': '100%',
      display: 'none',
      margin: 0,
      padding: 0,
      border: 'none',
      background: 'transparent',
      color: 'black',
      'box-sizing': 'border-box',
      overflow: 'hidden',
      'z-index': 1000000
    });
    this.dialog.className = 'web-app-window';
    if(typeof className === 'string') {
      this.dialog.className = this.dialog.className + ' ' + className;
    }

    // ensure backdrop is transparent by default
    const style = document.createElement('style');
    style.appendChild(
      document.createTextNode(`dialog.web-app-window::backdrop {
        background-color: transparent;
      }`));

    // create flex container for iframe
    this.container = document.createElement('div');
    applyStyle(this.container, {
      position: 'relative',
      width: '100%',
      height: '100%',
      margin: 0,
      padding: 0,
      display: 'flex',
      'flex-direction': 'column'
    });
    this.container.className = 'web-app-window-backdrop';

    // create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = url;
    this.iframe.scrolling = 'auto';
    applyStyle(this.iframe, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'none',
      background: 'transparent',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      'flex-grow': 1
    });

    // assemble dialog
    this.dialog.appendChild(style);
    this.container.appendChild(this.iframe);
    this.dialog.appendChild(this.container);

    // a.document.appendChild(this.iframe);
    // handle cancel (user pressed escape)
    this.dialog.addEventListener('cancel', e => {
      e.preventDefault();
      this.hide();
    });

    // attach to DOM
    document.body.appendChild(this.dialog);
    this.handle = this.iframe.contentWindow;
  }

  show() {
    this.dialog.style.display = 'block';
    if(this.dialog.showModal) {
      this.dialog.showModal();
    }
  }

  close() {
    this.dialog.style.display = 'none';
    if(this.dialog.close) {
      try {
        this.dialog.close();
      } catch(e) {
        console.error(e);
      }
    }
  }

  destroy() {
    this.dialog.parentNode.removeChild(this.dialog);
  }
}

function applyStyle(element, style) {
  for(const name in style) {
    element.style[name] = style[name];
  }
}
