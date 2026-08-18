<?php

declare(strict_types=1);

namespace Haschke\BeTabs\EventListener;

use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;
use TYPO3\CMS\Core\Page\PageRenderer;

final class BackendAssetListener
{
    public function __construct(private readonly PageRenderer $pageRenderer) {}

    public function __invoke(): void
    {
        if ($GLOBALS['BE_USER']->uc['tx_betabs_disable'] ?? false) {
            return;
        }

        $this->pageRenderer->getJavaScriptRenderer()->addJavaScriptModuleInstruction(
            JavaScriptModuleInstruction::create('@haschke/be-tabs/main.js')
        );
        $this->pageRenderer->addInlineLanguageLabelFile('EXT:be_tabs/Resources/Private/Language/locallang.xlf');
        $this->pageRenderer->addCssFile('EXT:be_tabs/Resources/Public/Css/tabs.css');

        $t3MajorVersion = (new Typo3Version())->getMajorVersion();
        if ($t3MajorVersion === 12 || $t3MajorVersion === 13) {
            $this->pageRenderer->addCssFile('EXT:be_tabs/Resources/Public/Css/tabs-v12-13.css');
        }
    }
}
