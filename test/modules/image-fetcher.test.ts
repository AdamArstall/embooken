import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EpubData, EpubImage } from "../../src/types";
import { fetchImages } from "../../src/modules/image-fetcher";
import * as dataHelper from "../helpers/test-data-helper";
import { createImageFetchStub } from "../doubles/fetch";

beforeEach(() => {
    vi.stubGlobal("fetch", createImageFetchStub());
});

describe("fetchImages", () => {
    it.each([{ images: [] }, { images: dataHelper.makeEpubImages() }])(
        "adds missing image placeholder",
        async ({ images }) => {
            const data: EpubData = dataHelper.makeEpubData({ images });
            const files = dataHelper.makeEpubFilesArray();
            const imageCount = data.images.length;

            await fetchImages(data, files);

            expect(data.images.length).toBeGreaterThan(imageCount);
            const placeholderImage = data.images.find(
                (i) => i.id === "image-not-found",
            );
            expect(placeholderImage).toBeTruthy();
            expect(
                files[`OEBPS/images/${placeholderImage!.filename}`],
            ).toBeTruthy();
        },
    );
});

describe("fetchImages with broken image", () => {
    function getTestData() {
        const brokenImage: EpubImage = {
            id: "broken-image",
            url: "https://images.example.com/photos/broken.png?response=404",
            filename: "broken.png",
            mediaType: "image/png",
        };

        const data: EpubData = {
            title: "Test Article",
            content: `
                <article>
                    <p>Test Article</p>
                    <img id="image-1" src="images/image-1.png"></img>
                    <img id="broken-image" src="images/broken.png"></img>
                </article>`,
            images: [
                {
                    id: "image-1",
                    url: "https://images.example.com/photos/image-1.png",
                    filename: "image-1.png",
                    mediaType: "image/png",
                },
                brokenImage,
            ],
        };

        return {
            brokenImage,
            data,
            files: dataHelper.makeEpubFilesArray(),
        };
    }

    it("removes broken image from epub data", async () => {
        const { brokenImage, data, files } = getTestData();
        const imageCount = data.images.length;
        await fetchImages(data, files);

        expect(data.images.length).toEqual(imageCount);
        expect(
            data.images.find((i) => i.id === brokenImage.id),
        ).toBeUndefined();
    });

    it("removes broken image from files", async () => {
        const { brokenImage, data, files } = getTestData();
        await fetchImages(data, files);

        expect(files[`OEBPS/images/${brokenImage.filename}`]).toBeUndefined();
    });

    it("replaces broken image src in content with placeholder", async () => {
        const { brokenImage, data, files } = getTestData();
        await fetchImages(data, files);

        expect(
            data.content.includes(`src=images/${brokenImage.filename}`),
        ).toEqual(false);
        expect(
            data.content.includes(`src="images/image-not-found-icon`),
        ).toEqual(true);
    });
});
