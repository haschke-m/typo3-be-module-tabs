<?php

declare(strict_types=1);

namespace Haschke\BeTabs\EventListener;

use TYPO3\CMS\Backend\Controller\Event\BeforeBackendPageRenderEvent;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;

final class BackendAssetListener
{
    #[AsEventListener(event: BeforeBackendPageRenderEvent::class)]
    public function __invoke(BeforeBackendPageRenderEvent $event): void
    {
        // Side-effect module: it self-initializes on import (invoke() would target
        // a default export, which we don't have).
        $event->javaScriptRenderer->addJavaScriptModuleInstruction(
            JavaScriptModuleInstruction::create('@haschke/be-tabs/tabs.js')
        );
        $event->pageRenderer->addCssFile('EXT:be_tabs/Resources/Public/Css/tabs.css');
    }
}
