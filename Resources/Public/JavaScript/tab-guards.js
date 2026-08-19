/**
 * capability checks before taking over the backend navigation since none of which we use
 * is Public API, if methods are missing or out of expected shape tabs should stay off
 */
import { ScaffoldIdentifierEnum } from '@typo3/backend/enum/viewport/scaffold-identifier.js';
import { ModuleStateStorage } from '@typo3/backend/storage/module-state-storage.js';
import { ModuleUtility } from '@typo3/backend/module.js';

// we replace these ContentContainer methods
const REQUIRED_CONTAINER_METHODS = ['setUrl', 'get', 'getUrl', 'refresh'];

// we rely on setUrl(url, request, module)
const SET_URL_ARGUMENTS = 3;

// per tab navigation tree state is kept in and restored from these
const REQUIRED_STATE_STORAGE_METHODS = ['current', 'update'];

// hardcoded selectors to check
const EXPECTED_SCAFFOLD = {
    contentModuleRouter: 'typo3-backend-module-router',
    contentModuleIframe: '.t3js-scaffold-content-module-iframe',
};

export function getUnsupportedReason(cc, router) {
    if (!router) return 'module router element missing';
    if (!cc) return 'ContentContainer missing';

    const missing = REQUIRED_CONTAINER_METHODS.filter((name) => typeof cc[name] !== 'function');
    if (missing.length) return `ContentContainer.${missing.join('(), ')}() missing`;

    if (cc.setUrl.length < SET_URL_ARGUMENTS) {
        return `ContentContainer.setUrl() takes ${cc.setUrl.length} arguments, expected ${SET_URL_ARGUMENTS}`;
    }

    for (const [name, expected] of Object.entries(EXPECTED_SCAFFOLD)) {
        if (ScaffoldIdentifierEnum[name] !== expected) {
            return `ScaffoldIdentifierEnum.${name} is "${ScaffoldIdentifierEnum[name]}", expected "${expected}"`;
        }
    }

    const missingState = REQUIRED_STATE_STORAGE_METHODS.filter((name) => typeof ModuleStateStorage?.[name] !== 'function');
    if (missingState.length) return `ModuleStateStorage.${missingState.join('(), ')}() missing`;

    // used to resolve which tree a module uses, without it every tab would share one selection
    if (typeof ModuleUtility?.getFromName !== 'function') return 'ModuleUtility.getFromName() missing';

    // tab bar is mounted into the doc holding the router
    if (!router.parentElement) return 'module router has no parent element to mount into';

    return null;
}
