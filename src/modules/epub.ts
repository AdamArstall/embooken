import { zipSync, strToU8 } from "fflate";
import { fetchImages } from "./image-fetcher";
import type { EpubData, EpubImage } from "../types";

export async function createEpubFromData(
    data: EpubData,
): Promise<Uint8Array<ArrayBuffer>> {
    const files: Record<string, Uint8Array<ArrayBuffer>> = {
        mimetype: strToU8("application/epub+zip"),
    };

    await fetchImages(data, files);
    addContainerXml(files);
    addContentXml(data, files);
    addNavXhtml(data, files);
    addStyleCss(files);
    addChapterXhtml(data, files);

    return zipSync(files, { level: 0 });
}

function addContainerXml(files: Record<string, Uint8Array<ArrayBuffer>>) {
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
    <container
        version="1.0"
        xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile
                full-path="OEBPS/content.opf"
                media-type="application/oebps-package+xml"/>
        </rootfiles>
    </container>`;

    files["META-INF/container.xml"] = strToU8(containerXml);
}

function addContentXml(
    data: EpubData,
    files: Record<string, Uint8Array<ArrayBuffer>>,
) {
    const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
    <package
        xmlns="http://www.idpf.org/2007/opf"
        version="3.0"
        unique-identifier="book-id">

        <metadata
            xmlns:dc="http://purl.org/dc/elements/1.1/">

            <dc:identifier id="book-id">
                urn:uuid:${crypto.randomUUID()}
            </dc:identifier>

            <dc:title>${data.title}</dc:title>

            <dc:language>en</dc:language>

            <meta property="dcterms:modified">
                ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}
            </meta>

        </metadata>

        <manifest>

            <item
                id="chapter-1"
                href="chapter.xhtml"
                media-type="application/xhtml+xml"/>

            <item
                id="nav"
                href="nav.xhtml"
                media-type="application/xhtml+xml"
                properties="nav"/>

                ${getManifestImages(data.images)}

        </manifest>

        <spine>
            <itemref idref="chapter-1"/>
        </spine>

    </package>`;

    files["OEBPS/content.opf"] = strToU8(contentXml);
}

function addNavXhtml(
    data: EpubData,
    files: Record<string, Uint8Array<ArrayBuffer>>,
) {
    const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE html>
    <html
        xmlns="http://www.w3.org/1999/xhtml"
        xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
        <title>Table of Contents</title>
    </head>
    <body>
        <nav epub:type="toc" id="toc">
            <h1>Contents</h1>
            <ol>
                <li>
                    <a href="chapter.xhtml">
                        ${data.title}
                    </a>
                </li>
            </ol>
        </nav>
    </body>
    </html>`;

    files["OEBPS/nav.xhtml"] = strToU8(navXhtml);
}

function addStyleCss(files: Record<string, Uint8Array<ArrayBuffer>>) {
    const styleCss = `
    body { font-family: Georgia, serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: auto; }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    img { max-width: 100%; height: auto; }`;

    files["OEBPS/styles/style.css"] = strToU8(styleCss);
}

function addChapterXhtml(
    data: EpubData,
    files: Record<string, Uint8Array<ArrayBuffer>>,
) {
    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE html>
    <html
        xmlns="http://www.w3.org/1999/xhtml"
        xmlns:epub="http://www.idpf.org/2007/ops">
        <head>
            <title>${data.title}</title>
        </head>
        <body>
            <h1>${data.title}</h1>
            ${data.content}
        </body>
    </html>`;

    files["OEBPS/chapter.xhtml"] = strToU8(chapterXhtml);
}

function getManifestImages(images: EpubImage[]): string {
    let result = "";

    images.forEach((image) => {
        result += `<item
            id="${image.id}"
            href="images/${image.filename}"
            media-type="${image.mediaType}"/>\n\n`;
    });

    return result;
}
