import { handleContentMessage } from "./modules/content-handler";

browser.runtime.onMessage.addListener(handleContentMessage);
