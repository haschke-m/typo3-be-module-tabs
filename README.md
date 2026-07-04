# BE Module Tabs

Browser-like tab navigation for the TYPO3 backend.

## What it does

By default, the TYPO3 backend has a single content area. Switching modules
reloads that area, so any in-progress state (scroll position, filters, open
records) is lost when you navigate away and back.

be_tabs adds a tab bar above the module content area. Each tab keeps its own
persistent iframe, so switching between tabs preserves the state of every
open module instead of resetting it.

- Click a module in the module menu to load it in the active tab.
- Ctrl/Cmd-click (or middle-click) a module to open it in a new tab.
- Clicking a module that is already open focuses its tab instead of
  reloading it.
- Open tabs are restored after a full backend reload.

## Installation

Requires TYPO3 v14.

```
composer require haschke/be-tabs
```

Then activate the extension, e.g.:

```
vendor/bin/typo3 extension:setup
```

No further configuration is needed.
