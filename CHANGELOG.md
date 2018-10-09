# web-request-rpc ChangeLog

## 1.0.4 - 2018-10-09

### Fixed
- Use `fixed` positioning for WebAppWindow iframe to
  fix mobile CSS issues.

## 1.0.3 - 2018-09-27

### Fixed
- Make early closing of WebAppContext more robust and
  expose `closed` flag.
- Prevent timeout from firing when the WebAppContext
  is intentionally closed.

## 1.0.2 - 2018-08-20

### Fixed
- Disable body overflow when showing UI.

### Changed
- Make default loading timeout 60 seconds.

## 1.0.1 - 2018-07-30

### Fixed
- Fix bugs with tracking pending requests; ensure to
  terminate all pending requests when client closes.

## 1.0.0 - 2018-07-20

## 0.1.7 - 2018-03-22

### Changed
- Improve error marshalling.
- Do not bundle dialog polyfill or require HTML5 Dialog.

## 0.1.6 - 2017-09-03

### Added
- Add ability to pass a Promise that resolves to a window handle.

## 0.1.5 - 2017-09-01

### Fixed
- Include `.js` extension on imports.

## 0.1.4 - 2017-08-31

### Fixed
- Fix display bug on Edge by defaulting iframe
  for WebAppWindow to 100% width+height.

## 0.1.3 - 2017-08-29

### Fixed
- Do not pass undefined `base`, it breaks Safari.

## 0.1.2 - 2017-08-24

### Fixed
- Ensure dialogPolyfill is loaded.

## 0.1.1 - 2017-08-24

### Added
- Add hook to enable customization of WebAppWindow.

## 0.1.0 - 2017-08-18

## 0.0.6 - 2017-08-18

### Fixed
- Add `dialog-polyfill` dependency.

## 0.0.5 - 2017-08-18

### Fixed
- Fixuse of `const`.

## 0.0.4 - 2017-08-18

### Changed
- Make WebAppWindow backdrop transparent by default.

## 0.0.3 - 2017-08-14

### Changed
- Rename `ClientWindow` to `WebAppWindow` to avoid confusion.

## 0.0.2 - 2017-08-10

## 0.0.1 - 2017-08-10

### Added
- Add core files.

- See git history for changes previous to this release.
