<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

$tabLabel = 'LLL:EXT:be_tabs/Resources/Private/Language/locallang.xlf:userSettings.tab';
$disableLabel = 'LLL:EXT:be_tabs/Resources/Private/Language/locallang.xlf:userSettings.disable';

if (method_exists(ExtensionManagementUtility::class, 'addUserSetting')) {
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
}
