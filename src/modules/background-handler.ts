import { createEpubFromData } from "./epub";
import { createFileName } from "./filename";
import type { BackgroundMessage } from "../types";

export async function handleBackgroundMessage(
    message: BackgroundMessage,
): Promise<any> {
    if (message.action === "create_epub_from_data") {
        const epubZip = await createEpubFromData(message.data);

        return {
            data: Array.from(epubZip),
            filename: createFileName(message.data.title, "epub"),
        };
    }

    return undefined;
}
