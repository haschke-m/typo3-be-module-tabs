<?php

declare(strict_types=1);

namespace Haschke\BeTabs\EventListener;

use TYPO3\CMS\Backend\Controller\Event\AfterBackendPageRenderEvent;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;
use TYPO3\CMS\Core\Page\PageRenderer;

final class BackendAssetListener
{
    public function __construct(private readonly PageRenderer $pageRenderer) {}

    #[AsEventListener(event: AfterBackendPageRenderEvent::class)]
    public function __invoke(): void
    {
        $this->pageRenderer->getJavaScriptRenderer()->addJavaScriptModuleInstruction(
            JavaScriptModuleInstruction::create('@haschke/be-tabs/main.js')
        );
        $this->pageRenderer->addCssFile('EXT:be_tabs/Resources/Public/Css/tabs.css');

        if ((new Typo3Version())->getMajorVersion() === 13) {
            $this->pageRenderer->addCssFile('EXT:be_tabs/Resources/Public/Css/tabs-v13.css');
        }
    }
}
