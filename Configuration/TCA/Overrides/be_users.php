<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

$tabLabel = 'LLL:EXT:be_tabs/Resources/Private/Language/locallang.xlf:userSettings.tab';
$disableLabel = 'LLL:EXT:be_tabs/Resources/Private/Language/locallang.xlf:userSettings.disable';

if (method_exists(ExtensionManagementUtility::class, 'addUserSetting')) {
    // TYPO3 >= 14.2: addFieldsToUserSettings() is deprecated in favor of addUserSetting().
    $GLOBALS['TCA']['be_users']['columns']['user_settings']['showitem']
        = ($GLOBALS['TCA']['be_users']['columns']['user_settings']['showitem'] ?? '')
        . ', --div--;' . $tabLabel;

    ExtensionManagementUtility::addUserSetting(
        'tx_betabs_disable',
        [
            'label' => $disableLabel,
            'config' => [
                'type' => 'check',
                'renderType' => 'checkboxToggle',
            ],
        ],
        'after:--div--;' . $tabLabel
    );
} else {
    // TYPO3 13.4 - 14.1: addUserSetting() does not exist yet.
    $GLOBALS['TYPO3_USER_SETTINGS']['columns']['tx_betabs_disable'] = [
        'type' => 'check',
        'label' => $disableLabel,
    ];

    ExtensionManagementUtility::addFieldsToUserSettings(
        '--div--;' . $tabLabel . ', tx_betabs_disable'
    );
}
