# BE Module Tabs

Browser-like tab navigation for the TYPO3 backend.  
Currently supporting TYPO3 v13 and v14.

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

This extension is under active development and not publicly available via packagist.org.  
Move repository content into a new extension directory and run:  
`composer require haschke/be-tabs:@dev`  

No further configuration needed.
## Known Issues
- Some module titles cannot be identified with the correct label showing an internal identifier. 
E.g. 'Content Security Policy' shown as 'content_security_policy'
- Since there is no tab limitation, there could be an excessive ram usage when opening a lot of tabs.
