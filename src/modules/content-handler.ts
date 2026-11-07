import { extractEpubData, getDocRootElementId } from "./extract";
import { downloadBlob } from "./downloads";
import type { ContentMessage } from "../types";
import { sendBackgroundMessage } from "./messaging";

export async function handleContentMessage(
    message: ContentMessage,
): Promise<any> {
    switch (message.action) {
        case "convert_page_to_epub":
            try {
                if (!message.data.rootId) {
                    alert("Page not compatible!");
                    return { success: false, error: "Page not compatible" };
                }

                const data = extractEpubData(message.data.rootId);

                return sendBackgroundMessage({
                    action: "create_epub_from_data",
                    data,
                });
            } catch (error) {
                console.error("Error in content script:", error);
                return { success: false, error: "Script failed" };
            }
        case "get_root_element_id":
            const id = getDocRootElementId();
            return { success: !!id, rootId: id };
        case "download_blob":
            downloadBlob(message.data.blob, message.data.filename);
            return { success: true };
    }

    return undefined;
}
