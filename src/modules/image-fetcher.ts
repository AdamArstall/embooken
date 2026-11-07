import { strToU8 } from "fflate";
import placeholderSvg from "../assets/image-not-found-icon.svg?raw";
import type { EpubData, EpubImage } from "../types";

export async function fetchImages(
    data: EpubData,
    files: Record<string, Uint8Array>,
): Promise<void> {
    const placeholderImage: EpubImage = {
        id: "image-not-found",
        filename: "image-not-found-icon.svg",
        url: "images/image-not-found-icon.svg",
        mediaType: "image/svg+xml",
    };

    for (let i = 0; i < data.images.length; i++) {
        const image = data.images[i];
        if (!image) continue;

        const response = await fetch(image.url);
        if (response.ok) {
            const imageData = new Uint8Array(await response.arrayBuffer());
            files[`OEBPS/images/${image.filename}`] = imageData;
        } else {
            data.images.splice(i, 1);
            i--;
            data.content = data.content.replaceAll(
                new RegExp(
                    `(?<=\<img[^\>]*)src="images\/${image.filename}"`,
                    "g",
                ),
                `src="images/${placeholderImage.filename}"`,
            );
        }
    }

    data.images.push(placeholderImage);
    files[`OEBPS/images/${placeholderImage.filename}`] =
        strToU8(placeholderSvg);
}
