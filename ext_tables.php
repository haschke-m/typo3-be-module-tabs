<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

$tabLabel = 'LLL:EXT:be_tabs/Resources/Private/Language/locallang.xlf:userSettings.tab';
$disableLabel = 'LLL:EXT:be_tabs/Resources/Private/Language/locallang.xlf:userSettings.disable';

if (!method_exists(ExtensionManagementUtility::class, 'addUserSetting')) {
    $GLOBALS['TYPO3_USER_SETTINGS']['columns']['tx_betabs_disable'] = [
        'type' => 'check',
        'label' => $disableLabel,
    ];

    ExtensionManagementUtility::addFieldsToUserSettings(
        '--div--;' . $tabLabel . ', tx_betabs_disable'
    );
}
