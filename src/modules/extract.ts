import { escapeXml } from "./strings";
import type { EpubData, EpubImage, EpubLink } from "../types";
import {
    getImageMediaType,
    isImageExtension,
    type ImageExtension,
} from "./images";

export function getDocRootElementId(): string | undefined {
    let rootElement: HTMLElement | undefined;

    const articles = document.getElementsByTagName("article");
    if (articles.length === 1) {
        rootElement = articles[0];
    }

    if (!rootElement) return;

    const id = crypto.randomUUID();
    rootElement.setAttribute("data-epub-id", id);

    return id;
}

export function extractEpubData(rootId: string): EpubData {
    const pageRootElement = document.querySelector<HTMLElement>(
        `[data-epub-id="${rootId}"]`,
    )!;
    const rootElement = pageRootElement.cloneNode(true) as HTMLElement;

    const title = escapeXml(document.title) || "Article";
    const images = processAndGetImages(rootElement);
    convertLinksToFootnotes(rootElement);
    sanitizeContent(rootElement);
    const content = getContentXhtml(rootElement);

    return {
        title,
        content,
        images,
    };
}

export function getImageExtension(
    img: HTMLImageElement,
): ImageExtension | undefined {
    let url: URL;
    try {
        url = new URL(img.src);
    } catch {
        // Missing or malformed src (e.g. lazy-loaded images)
        return undefined;
    }

    // data: and blob: URLs can't be downloaded again from the background script
    if (!/^https?:$/.test(url.protocol)) {
        return undefined;
    }

    const filename = url.pathname.split("/").pop();

    if (!filename) {
        return undefined;
    }

    const extension = filename
        .slice(filename.lastIndexOf(".") + 1)
        .toLowerCase();

    return isImageExtension(extension) ? extension : undefined;
}

export function processAndGetImages(contentNode: HTMLElement): EpubImage[] {
    const images: EpubImage[] = [];
    const imageNodes = contentNode.querySelectorAll("img");
    imageNodes.forEach((node, index) => {
        const ext = getImageExtension(node);
        if (!ext) {
            replaceUnembeddableImage(node);
            return;
        }
        const id = `image-${index + 1}`;

        const imageData = {
            id,
            url: node.src,
            filename: `${id}.${ext}`,
            mediaType: getImageMediaType(ext),
        };

        updateImageAttributes(node, imageData);
        images.push(imageData);
    });

    return images;
}

// EPUB doesn't allow remote images, so images that can't be embedded are
// replaced with a link to the original or, when linking isn't possible,
// a plain text placeholder.
function replaceUnembeddableImage(img: HTMLImageElement) {
    const doc = img.ownerDocument;
    const alt = img.getAttribute("alt")?.trim();
    const label = alt ? `[Image: ${alt}]` : "[Image]";

    // Nested links are invalid, so only link when not already inside one
    if (/^https?:\/\//i.test(img.src) && !img.closest("a")) {
        const link = doc.createElement("a");
        link.setAttribute("href", img.src);
        link.classList.add("not-ref");
        link.textContent = label;
        img.replaceWith(link);
    } else {
        img.replaceWith(doc.createTextNode(label));
    }
}

function updateImageAttributes(
    imageElement: HTMLImageElement,
    data: EpubImage,
) {
    imageElement.setAttribute("id", data.id);
    imageElement.setAttribute("data-epub-src", `images/${data.filename}`);
    imageElement.removeAttribute("src");
    imageElement.removeAttribute("srcset");
    imageElement.removeAttribute("sizes");
}

export function convertLinksToFootnotes(contentNode: HTMLElement) {
    let count = 0;
    contentNode.querySelectorAll("a[href]:not(.not-ref)").forEach((anchor) => {
        const rawHref = anchor.getAttribute("href");
        if (!rawHref) return;

        // Fragment links only work if their target is part of the book
        if (rawHref.startsWith("#")) {
            if (!hasFragmentTarget(contentNode, rawHref.slice(1))) {
                anchor.replaceWith(...anchor.childNodes);
            }
            return;
        }

        // Only web links are converted. Other schemes (e.g. mailto:) are kept.
        const href = resolveWebUrl(anchor, rawHref);
        if (!href) return;

        // Image links keep their image but href is updated to resolved value.
        if (anchor.querySelector("img")) {
            anchor.setAttribute("href", href);
            return;
        }

        count++;
        const sup = contentNode.ownerDocument.createElement("sup");
        const marker = contentNode.ownerDocument.createElement("a");

        marker.setAttribute("href", `#fn-${count}`);
        marker.setAttribute("id", `fnref-${count}`);
        marker.textContent = `[${count}]`;

        sup.appendChild(marker);

        // Remove underline from anchor text
        anchor.querySelectorAll("u").forEach((u) => {
            u.replaceWith(...u.childNodes);
        });

        anchor.replaceWith(...anchor.childNodes, sup);

        const link = {
            number: count,
            url: href,
        };

        createFootnoteAside(contentNode, link);
    });
}

function hasFragmentTarget(contentNode: HTMLElement, fragment: string) {
    if (!fragment) return false;

    let id = fragment;
    try {
        id = decodeURIComponent(fragment);
    } catch {
        // Use the fragment as written
    }

    return [...contentNode.querySelectorAll("[id], a[name]")].some(
        (el) => el.id === id || el.getAttribute("name") === id,
    );
}

// Returns an absolute http(s) URL, resolving relative links against the page.
function resolveWebUrl(anchor: Element, href: string): string | undefined {
    if (/^https?:\/\//i.test(href)) return href;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return undefined;

    const resolved = (anchor as HTMLAnchorElement).href;
    return /^https?:\/\//i.test(resolved) ? resolved : undefined;
}

function createFootnoteAside(contentNode: HTMLElement, link: EpubLink) {
    const aside = contentNode.ownerDocument.createElement("aside");
    aside.setAttribute("epub:type", "footnote");
    aside.id = `fn-${link.number}`;

    const p = contentNode.ownerDocument.createElement("p");

    const marker = contentNode.ownerDocument.createElement("a");
    marker.setAttribute("epub:type", "noteref");
    marker.href = `#fnref-${link.number}`;
    marker.textContent = `${link.number}.`;

    const spacer = contentNode.ownerDocument.createElement("span");
    spacer.textContent = " ";

    const footnoteLink = contentNode.ownerDocument.createElement("a");
    footnoteLink.href = link.url;
    footnoteLink.textContent =
        link.url.substring(0, 100) + (link.url.length > 100 ? "..." : "");

    p.appendChild(marker);
    p.appendChild(spacer);
    p.appendChild(footnoteLink);

    aside.appendChild(p);
    contentNode.appendChild(aside);
}

export function sanitizeContent(contentNode: HTMLElement) {
    // Remove things EPUB shouldn't contain
    contentNode
        .querySelectorAll(
            "script, iframe, object, embed, form, input, button, video, audio",
        )
        .forEach((el) => el.remove());

    // Replace javascript: URLs with their child nodes
    contentNode.querySelectorAll("a").forEach((anchor) => {
        if (anchor.getAttribute("href")?.startsWith("javascript:")) {
            anchor.replaceWith(...anchor.childNodes);
        }
    });

    // Remove event handlers
    contentNode.querySelectorAll("*").forEach((el) => {
        for (const attr of [...el.attributes]) {
            if (attr.name.toLowerCase().startsWith("on")) {
                el.removeAttribute(attr.name);
            }
        }
    });
}

export function getContentXhtml(contentNode: HTMLElement): string {
    return (
        new XMLSerializer()
            .serializeToString(contentNode)
            // Replace data-epub-src attributes with src attributes
            // by RegExp replace on the the serialized string to avoid modifying the DOM
            // which triggers requests to invalid EPUB archive URLs.
            // Only replace the string inside XML tags and not content.
            .replaceAll(/(?<=<\w+[^>]*)data-epub-src=(?=.*>)/g, "src=")
    );
}
