import { downloadBlob } from "../modules/downloads";
import { messageCurrentTab } from "../modules/messaging";

document.addEventListener("DOMContentLoaded", async () => {
    const response = await messageCurrentTab({
        action: "get_root_element_id",
    }).catch((error) => {
        console.error("Could not reach the content script:", error);
        return undefined;
    });
    const compatible = response?.success === true;

    if (compatible) {
        const convertToEpubButton = document.getElementById(`btn-epub`);

        if (!convertToEpubButton) return;

        convertToEpubButton.addEventListener("click", async () => {
            const overlay = document.getElementById("overlay");
            if (!overlay) return;

            overlay.style.display = "block";

            const fileData = await messageCurrentTab({
                action: "convert_page_to_epub",
                data: {
                    rootId: response.rootId,
                },
            });

            const bytes = new Uint8Array(fileData.data);
            const blob = new Blob([bytes], {
                type: "application/epub+zip",
            });

            downloadBlob(blob, fileData.filename);

            setTimeout(() => {
                overlay.style.display = "none";
            }, 1000);
        });
    }
    setContentVisibility(compatible);
});

function setContentVisibility(compatible: boolean) {
    const compatibleContent = document.getElementById("compatible")!;
    const incompatibleContent = document.getElementById("incompatible")!;

    if (compatible) {
        compatibleContent.style.display = "block";
        incompatibleContent.style.display = "none";
    } else {
        compatibleContent.style.display = "none";
        incompatibleContent.style.display = "block";
    }
}
