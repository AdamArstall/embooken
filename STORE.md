# Store metadata

<!--STORE.md is what
`extension_submit sync-listing` reads to fill the Chrome Web Store, Firefox
Add-ons, Edge Add-ons and Mac App Store listings, and what the store
preflights check. Every store asks for this material at submission time, so
keep it current as the code changes instead of rewriting it at the end. A
line marked TODO is a fact only the owner can supply: the file shows what is
missing and never invents listing copy, and a value that still starts with
TODO is skipped, not sent. Items a store takes only on its own dashboard
(Chrome promo tiles and data-use answers, Edge logo, tiles and properties,
Apple's App Privacy and age rating) stay by hand and are listed under each
store below. The HTML comments carry each field's format and limits, and the
readers ignore them.-->

Last updated: 2026-10-24

## Listing

- Name: embooken
    <!-- The store title, 100 characters at most on every store. -->
- Summary: Creates an EPUB file from web page article content.
    <!-- Chrome's summary, 132 characters at most. It doubles as the Safari
    subtitle only when it fits 30. -->
- Subtitle: TODO a 30 character App Store subtitle
    <!-- App Store subtitle, 30 characters at most. Without it the Safari push
    leaves the field empty. -->
- Description:

    When opened on a page which contains an article, the user is given a button
    to download the content of the page as an EPUB file which can be viewed on
    another device such as an e-reader.

- Category: Other (Chrome Web Store,Firefox Add-ons), Utilities (App Store)
    <!-- One category per store, the store names in parentheses stay out of
    the value. One of them must be an App Store category (Productivity or
    Utilities): Apple refuses an upload without a primary category. -->
- Language: en
- License: GPL-3.0-only
    <!-- A bare SPDX identifier with no trailing period: "MIT." once reached
    AMO as the license. -->
- Support email: TODO the address users and reviewers write to
- Homepage: TODO the project or company site URL
- Search terms: TODO up to seven terms, comma separated
    <!-- Comma list. Edge takes at most 7 terms and 21 words in all, and
    Safari keywords are 100 characters in all. -->
- Screenshots:
    1. TODO screenshots/01.png
    <!-- One PNG path per numbered line, relative to the project. Chrome takes
    1280x800 or 640x400, Edge 1280x800 or 640x480, the App Store exactly
    1280x800, 1440x900, 2560x1600 or 2880x1800 in RGB without alpha and
    showing the extension in real Safari (a 2880x1800 capture of a Safari
    window is the simplest way). Chrome and Edge also show 440x280 and
    1400x560 promo tiles. -->

## Privacy and data use

- Privacy policy URL: TODO (Apple requires one on every app, Chrome and Edge
  once any data is handled)
    <!-- The only place this URL lives. The readers take the first http or
    https address on this line, so leave no sample address here. -->
- Data collected: none
    <!-- Every kind of data the extension collects, stores or sends, or none.
    Chrome, Edge and Apple each ask it again on their dashboards. -->
- Firefox data collection: none
    <!-- Mirrors browser_specific_settings.gecko.data_collection_permissions
    in the manifest. AMO reads the manifest, so the two must agree. -->

Per store answer sheets, filled from the two lines above:

- Chrome Web Store: the data-usage checkboxes and the three certifications
  on the Privacy practices tab, answered by hand on the developer dashboard.
- Firefox Add-ons: the manifest's data_collection_permissions is the
  declaration, and AMO reads it from the package.
- Edge Add-ons: the nine data categories and the three certifications on the
  Privacy page, typed once on Partner Center.
- App Store: App Privacy, "Data Not Collected" when the line above says
  none, answered by hand in App Store Connect.

## Chrome Web Store

### Single purpose

Generates an EPUB file from article content, for viewing on another reading device.

### Permissions justification

<!-- One bullet per permission, host permission and content script match
the manifest requests, as the Chrome dashboard and the Edge Privacy page
ask them. A reason that still starts with TODO is not sent. "Needed for
the extension to work" fails review on every store. -->

- Host permission <all_urls>: The content script to extract the EPUB content can be
  used on any page. Host permission is required to fetch embedded images to be packaged
  into the EPUB.
- Content script match <all_urls>: The content script to extract article content can
  be injected to any page.

Remote code: none. Every script ships inside the package, which is the
answer to the remote code question on Chrome and Edge.

### Test instructions

Opening the extension on a page which contains a single <article> tag, such as on
sites such as substack or ghost, will display a button with text: "Download EPUB".
If there is no article or more than one, an incompatibility message is displayed
instead.

## Firefox Add-ons

### Reviewer notes

Build from source with Node 22.22.2 and npm 10.9.7: run npm install, then
npm run build-firefox. The upload is dist/release-firefox.zip, byte for byte.
The uploaded source is dist/release-source.zip

Opening the extension on a page which contains a single <article> tag, such as on
sites such as substack or ghost, will display a button with text: "Download EPUB".
If there is no article or more than one, an incompatibility message is displayed
instead.

### Release notes

Initial version

## Version history

One line per version and store attempt with its outcome, newest first, for
example "0.1.0: Chrome draft uploaded 2026-10-21, AMO upload refused 401 bad
key pair, Edge draft pending".

- 0.1.0 : initial version.
