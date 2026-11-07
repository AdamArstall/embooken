import { strToU8 } from "fflate";
import type { EpubData, EpubImage } from "../../src/types";
import { imageBytes } from "../fixtures/imageBytes";
import {
    getImageMediaType,
    type ImageExtension,
} from "../../src/modules/images";

export function makeEpubData(overrides: Partial<EpubData> = {}): EpubData {
    return {
        title: "My Article",
        content: "<article><p>Hello</p></article>",
        images: [],
        ...overrides,
    };
}

export function makeEpubImages(
    fileExtensions: ImageExtension[] = Object.keys(
        imageBytes,
    ) as ImageExtension[],
): EpubImage[] {
    let result: EpubImage[] = [];
    fileExtensions.forEach((ext, index) => {
        result.push({
            id: `example-${ext}-${crypto.randomUUID()}`,
            url: `https://images.example.com/photos/test.${ext}`,
            filename: `image-${index}.${ext}`,
            mediaType: getImageMediaType(ext),
        });
    });

    return result;
}

export function makeEpubFilesArray(
    overrides: Record<string, Uint8Array> = {},
): Record<string, Uint8Array> {
    return {
        mimetype: strToU8("application/epub+zip"),
        ...overrides,
    };
}
