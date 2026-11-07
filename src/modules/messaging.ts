import type { BackgroundMessage, ContentMessage } from "../types";

export async function messageCurrentTab(message: ContentMessage): Promise<any> {
    const tabs = await browser.tabs.query({
        currentWindow: true,
        active: true,
    });
    if (tabs.length === 1) {
        const tab = tabs[0];
        if (!tab?.id) return;
        return browser.tabs.sendMessage(tab.id, message);
    }
}

export async function sendBackgroundMessage(
    message: BackgroundMessage,
): Promise<any> {
    return browser.runtime.sendMessage(message);
}
