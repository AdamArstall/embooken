import { vi } from "vitest";
import { imageBytes } from "../fixtures/imageBytes";
import { isImageExtension } from "../../src/modules/images";

export const createImageFetchStub = () =>
    vi.fn(async (url: string) => {
        const urlObj = new URL(url);
        const extension = urlObj.pathname.split(".").pop() ?? "";
        const status = urlObj.searchParams.get("response") ?? "200";
        const bytes = isImageExtension(extension) ? imageBytes[extension] : [];

        switch (status) {
            case "200":
                return bytes
                    ? new Response(bytes as BlobPart)
                    : new Response("not found", { status: 404 });
            case "404":
                return new Response("not found", { status: 404 });
            default:
                return new Response("error", { status: 500 });
        }
    });
