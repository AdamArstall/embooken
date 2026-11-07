import { handleBackgroundMessage } from "./modules/background-handler";

browser.runtime.onMessage.addListener(handleBackgroundMessage);
