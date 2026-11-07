import { afterEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { createEpubFromData } from "../../src/modules/epub";
import { parseXml } from "../../src/modules/strings";
import { makeEpubData } from "../helpers/test-data-helper";
import type { EpubData } from "../../src/types";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

async function build(data: EpubData) {
    const epubZip = await createEpubFromData(data);
    const bytes = new Uint8Array(epubZip);
    const blob = new Blob([bytes], { type: "application/epub+zip" });
    return { blob, bytes, files: unzipSync(bytes) };
}

function stubImageFetch(response: () => Promise<unknown>) {
    vi.stubGlobal("fetch", vi.fn(response));
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("createEpub: container structure", () => {
    it("returns a blob with the epub mime type", async () => {
        const { blob } = await build(makeEpubData());
        expect(blob.type).toBe("application/epub+zip");
    });

    it("stores `mimetype` first and uncompressed", async () => {
        const { bytes, files } = await build(makeEpubData());

        expect(Object.keys(files)[0]).toBe("mimetype");
        expect(strFromU8(files["mimetype"]!)).toBe("application/epub+zip");

        // Local file header: signature, compression method at offset 8,
        // file name length at 26, file name starts at 30.
        const view = new DataView(bytes.buffer, bytes.byteOffset);
        expect(view.getUint32(0, true)).toBe(0x04034b50);
        expect(view.getUint16(8, true)).toBe(0); // stored
        const nameLength = view.getUint16(26, true);
        expect(strFromU8(bytes.slice(30, 30 + nameLength))).toBe("mimetype");
        // EPUB OCF: no extra field on the mimetype entry
        expect(view.getUint16(28, true)).toBe(0);
    });

    it("container.xml points at an existing package document", async () => {
        const { files } = await build(makeEpubData());
        const { doc, error } = parseXml(
            strFromU8(files["META-INF/container.xml"]!),
        );
        expect(error).toBeNull();

        const rootfile = doc.getElementsByTagName("rootfile")[0]!;
        const path = rootfile.getAttribute("full-path")!;
        expect(files[path]).toBeDefined();
        expect(rootfile.getAttribute("media-type")).toBe(
            "application/oebps-package+xml",
        );
    });

    it("emits well-formed XML for every xml/xhtml/opf part", async () => {
        const { files } = await build(makeEpubData());
        const xmlParts = Object.keys(files).filter((name) =>
            /\.(xml|opf|xhtml)$/.test(name),
        );
        expect(xmlParts.length).toBeGreaterThanOrEqual(4);

        for (const name of xmlParts) {
            const { error } = parseXml(strFromU8(files[name]!));
            expect(error, `${name} should be well-formed`).toBeNull();
        }
    });
});

describe("createEpub: package document", () => {
    it("lists chapter, nav and stylesheet-independent items in manifest and spine", async () => {
        const { files } = await build(makeEpubData());
        const { doc } = parseXml(strFromU8(files["OEBPS/content.opf"]!));

        const items = [...doc.getElementsByTagName("item")];
        const ids = items.map((i) => i.getAttribute("id"));
        expect(ids).toContain("chapter-1");
        expect(ids).toContain("nav");

        const nav = items.find((i) => i.getAttribute("id") === "nav")!;
        expect(nav.getAttribute("properties")).toBe("nav");

        const idrefs = [...doc.getElementsByTagName("itemref")].map((i) =>
            i.getAttribute("idref"),
        );
        expect(idrefs).toEqual(["chapter-1"]);
        for (const idref of idrefs) expect(ids).toContain(idref);
    });

    it("every manifest href exists in the archive", async () => {
        const { files } = await build(makeEpubData());
        const { doc } = parseXml(strFromU8(files["OEBPS/content.opf"]!));

        for (const item of doc.getElementsByTagName("item")) {
            const href = item.getAttribute("href")!;
            expect(files[`OEBPS/${href}`], `${href} missing`).toBeDefined();
        }
    });

    it("includes title, language and a modified timestamp in the right format", async () => {
        const { files } = await build(makeEpubData({ title: "Some Title" }));
        const { doc } = parseXml(strFromU8(files["OEBPS/content.opf"]!));

        expect(doc.getElementsByTagName("dc:title")[0]!.textContent).toBe(
            "Some Title",
        );
        expect(doc.getElementsByTagName("dc:language")[0]!.textContent).toBe(
            "en",
        );

        const modified = doc
            .getElementsByTagName("meta")[0]!
            .textContent!.trim();
        expect(modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    it("uses a unique identifier per book (currently hard-coded)", async () => {
        const a = await build(makeEpubData());
        const b = await build(makeEpubData());
        const idOf = (files: Record<string, Uint8Array>) =>
            parseXml(strFromU8(files["OEBPS/content.opf"]!))
                .doc.getElementsByTagName("dc:identifier")[0]!
                .textContent!.trim();

        expect(idOf(a.files)).not.toBe(idOf(b.files));
    });
});

describe("createEpub: content", () => {
    it("embeds the chapter content and title", async () => {
        const { files } = await build(
            makeEpubData({ content: "<p id='x'>Body text</p>" }),
        );
        const { doc, error } = parseXml(
            strFromU8(files["OEBPS/chapter.xhtml"]!),
        );

        expect(error).toBeNull();
        expect(doc.getElementsByTagName("h1")[0]!.textContent).toBe(
            "My Article",
        );
        expect(
            doc.getElementById("x")?.textContent ??
                doc.querySelector("p")!.textContent,
        ).toBe("Body text");
    });

    it("nav links to the chapter", async () => {
        const { files } = await build(makeEpubData());
        const { doc } = parseXml(strFromU8(files["OEBPS/nav.xhtml"]!));
        expect(doc.getElementsByTagName("a")[0]!.getAttribute("href")).toBe(
            "chapter.xhtml",
        );
    });
});

describe("createEpub: images", () => {
    const images = [
        {
            id: "image-1",
            url: "https://example.com/a.png",
            filename: "image-1.png",
            mediaType: "image/png",
        },
        {
            id: "image-3",
            url: "https://example.com/b.png",
            filename: "image-3.png",
            mediaType: "image/png",
        },
    ];

    it("fetches each image and stores it under OEBPS/images", async () => {
        stubImageFetch(async () => ({
            arrayBuffer: async () => PNG_BYTES.buffer.slice(0),
            ok: true,
        }));

        const { files } = await build(makeEpubData({ images }));

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledWith("https://example.com/a.png");
        expect(files["OEBPS/images/image-1.png"]).toEqual(PNG_BYTES);
        expect(files["OEBPS/images/image-3.png"]).toEqual(PNG_BYTES);
    });

    it("registers images in the manifest with the correct media type", async () => {
        stubImageFetch(async () => ({
            arrayBuffer: async () => PNG_BYTES.buffer.slice(0),
            ok: true,
        }));

        const { files } = await build(makeEpubData({ images }));
        const { doc } = parseXml(strFromU8(files["OEBPS/content.opf"]!));
        const item = [...doc.getElementsByTagName("item")].find(
            (i) => i.getAttribute("id") === "image-3",
        )!;

        expect(item.getAttribute("href")).toBe("images/image-3.png");
        expect(item.getAttribute("media-type")).toBe("image/png");
    });

    it("does not call fetch when there are no images", async () => {
        stubImageFetch(async () => {
            throw new Error("should not be called");
        });
        await build(makeEpubData());
        expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects when an image download fails (current behaviour)", async () => {
        stubImageFetch(async () => {
            throw new Error("network down");
        });
        await expect(
            createEpubFromData(makeEpubData({ images })),
        ).rejects.toThrow("network down");
    });

    it("skips images whose response is not OK instead of embedding an error page", async () => {
        stubImageFetch(async () => ({
            ok: false,
            status: 404,
            arrayBuffer: async () =>
                new TextEncoder().encode("Not found").buffer,
        }));

        const { files } = await build(makeEpubData({ images }));
        expect(files["OEBPS/images/image-1.png"]).toBeUndefined();
    });
});
