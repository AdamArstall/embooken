export const imageMediaTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    avif: "image/avif",
} as const;

export type ImageExtension = keyof typeof imageMediaTypes;
export type ImageMediaType = (typeof imageMediaTypes)[ImageExtension];

export function getImageMediaType(ext: ImageExtension): ImageMediaType {
    return imageMediaTypes[ext];
}

export function isImageExtension(value: string): value is ImageExtension {
    return Object.hasOwn(imageMediaTypes, value);
}
