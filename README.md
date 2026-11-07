embooken is a browser extension that generates EPUB files from article content.

## Get started

Install the extension by downloading it from the official directory for your browser:

- **[Chrome Web Store](<>)** for Chrome, Brave, Arc, Orion, and other Chromium-based browsers.
- **[Firefox Add-Ons](<>)** for Firefox and Firefox Mobile.

## Use

When viewing a compatible page, with a single article, a button "Download EPUB" will be visible in the extension pop-up.

## Developers

To build the extension:

```
npm run build
```

This will create the directory `dist/` containing subdirectories `chrome/`, and `firefox/` for the different browser versions, along with zip files for each and the source code.

### Run tests

```
npm test
```

Or run in watch mode during development:

```
npm run test:watch
```

Integration tests that validate created EPUB files are run with:

```
npm run validate
```

## Third-party libraries

- [fflate](https://github.com/101arrowz/fflate) for zip compression of EPUB archives
