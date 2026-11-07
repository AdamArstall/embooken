import { beforeEach, describe, expect, it } from "vitest";
import {
    convertLinksToFootnotes,
    extractEpubData,
    getContentXhtml,
    getDocRootElementId,
    getImageExtension,
    processAndGetImages,
    sanitizeContent,
} from "../../src/modules/extract";
import { parseXml } from "../../src/modules/strings";

function el(html: string): HTMLElement {
    const root = document.createElement("article");
    root.innerHTML = html;
    return root;
}

function img(src: string) {
    const node = document.createElement("img");
    node.setAttribute("src", src);
    return node;
}

describe("getDocRootElementId", () => {
    it("marks the only <article> and returns its id", () => {
        document.body.innerHTML = `<article><p>Hi</p></article>`;
        const rootId = getDocRootElementId();
        expect(rootId).toBeDefined();
        const article = document.querySelector("article")!;
        expect(article.getAttribute("data-epub-id")).toBe(rootId);
    });

    it("returns undefined when the page has no <article>", () => {
        document.body.innerHTML = `<div>No article</div>`;
        expect(getDocRootElementId()).toBeUndefined();
    });

    it("returns undefined when the page has several <article> elements", () => {
        document.body.innerHTML = `<article>a</article><article>b</article>`;
        expect(getDocRootElementId()).toBeUndefined();
        expect(document.querySelector("[data-epub-id]")).toBeNull();
    });

    it("returns a different id on each call", () => {
        document.body.innerHTML = `<article>a</article>`;

        const a = getDocRootElementId();
        const b = getDocRootElementId();

        expect(a).not.toBe(b);
    });
});

describe("getImageExtension", () => {
    it.each([
        ["https://x.test/a.jpg", "jpg"],
        ["https://x.test/a.jpeg", "jpeg"],
        ["https://x.test/a.PNG", "png"],
        ["https://x.test/a.webp?w=200&h=100", "webp"],
        ["https://x.test/path.with.dots/a.svg", "svg"],
        ["https://x.test/a.gif#frag", "gif"],
    ])("%s -> %s", (src, expected) => {
        expect(getImageExtension(img(src))).toBe(expected);
    });

    it.each([
        "https://x.test/a.bmp",
        "https://x.test/noextension",
        "https://x.test/",
        "https://x.test/a.constructor", // guards against prototype keys
        "data:image/png;base64,iVBORw0KGgo=",
        "blob:https://x.test/1234",
        "", // missing src, e.g. lazy-loaded images
    ])("returns undefined for %j", (src) => {
        expect(getImageExtension(img(src))).toBeUndefined();
    });
});

describe("processAndGetImages", () => {
    it("collects image data and rewrites attributes", () => {
        const root = el(
            `<p><img src="https://x.test/a.png" srcset="a 1x" sizes="10px" alt="A"></p>`,
        );
        const images = processAndGetImages(root);

        expect(images).toEqual([
            {
                id: "image-1",
                url: "https://x.test/a.png",
                filename: "image-1.png",
                mediaType: "image/png",
            },
        ]);

        const node = root.querySelector("img")!;
        expect(node.id).toBe("image-1");
        expect(node.getAttribute("data-epub-src")).toBe("images/image-1.png");
        expect(node.hasAttribute("src")).toBe(false);
        expect(node.hasAttribute("srcset")).toBe(false);
        expect(node.hasAttribute("sizes")).toBe(false);
        expect(node.getAttribute("alt")).toBe("A");
    });

    it("skips unsupported images but keeps ids tied to DOM position", () => {
        const root = el(
            `<img src="https://x.test/a.png"><img src="https://x.test/a.bmp"><img src="https://x.test/c.jpg">`,
        );
        const images = processAndGetImages(root);

        expect(images.map((i) => i.id)).toEqual(["image-1", "image-3"]);
    });

    describe("images that cannot be embedded", () => {
        it("become a link to the original image using the alt text", () => {
            const root = el(
                `<p><img src="https://x.test/a.bmp" alt=" A chart "></p>`,
            );
            expect(processAndGetImages(root)).toEqual([]);

            expect(root.querySelector("img")).toBeNull();
            const link = root.querySelector("p > a")!;
            expect(link.getAttribute("href")).toBe("https://x.test/a.bmp");
            expect(link.textContent).toBe("[Image: A chart]");
        });

        it("use a generic label when there is no alt text", () => {
            const root = el(`<img src="https://x.test/a.bmp">`);
            processAndGetImages(root);

            expect(root.querySelector("a")!.textContent).toBe("[Image]");
        });

        it("become a plain placeholder when there is nothing to link to", () => {
            const root = el(
                `<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="Inline"><img data-src="https://x.test/lazy.png" alt="Lazy"></p>`,
            );
            processAndGetImages(root);

            expect(root.querySelector("img")).toBeNull();
            expect(root.querySelector("a")).toBeNull();
            expect(root.querySelector("p")!.textContent).toBe(
                "[Image: Inline][Image: Lazy]",
            );
        });

        it("become plain text inside an existing link instead of nesting links", () => {
            const root = el(
                `<a href="https://x.test/page"><img src="https://x.test/a.bmp" alt="Pic"></a>`,
            );
            processAndGetImages(root);

            expect(root.querySelectorAll("a").length).toBe(1);
            expect(root.querySelector("a")!.textContent).toBe("[Image: Pic]");
        });
    });

    it("returns an empty list when there are no images", () => {
        expect(processAndGetImages(el("<p>none</p>"))).toEqual([]);
    });
});

describe("convertLinksToFootnotes", () => {
    it("replaces an external link with text, a marker and a footnote", () => {
        const root = el(
            `<p>See <a href="https://example.com/page">the docs</a> now.</p>`,
        );
        convertLinksToFootnotes(root);

        const p = root.querySelector("p")!;
        expect(p.textContent).toBe("See the docs[1] now.");

        const marker = p.querySelector("sup > a")!;
        expect(marker.getAttribute("href")).toBe("#fn-1");
        expect(marker.id).toBe("fnref-1");

        const aside = root.querySelector("aside#fn-1")!;
        expect(aside.getAttribute("epub:type")).toBe("footnote");
        expect(
            aside
                .querySelector('a[epub\\:type="noteref"]')!
                .getAttribute("href"),
        ).toBe("#fnref-1");
        expect(
            aside.querySelector("p > a:last-child")!.getAttribute("href"),
        ).toBe("https://example.com/page");
    });

    it("numbers multiple links sequentially", () => {
        const root = el(
            `<p><a href="https://a.test">a</a> <a href="http://b.test">b</a></p>`,
        );
        convertLinksToFootnotes(root);

        expect(root.querySelectorAll("aside").length).toBe(2);
        expect(root.querySelector("#fn-1")).not.toBeNull();
        expect(root.querySelector("#fn-2")).not.toBeNull();
        expect(root.querySelector("#fnref-2")).not.toBeNull();
    });

    it.each([
        ["mailto", `<a href="mailto:a@b.test">x</a>`],
        [
            "image link",
            `<a href="https://a.test"><img src="https://a.test/i.png"></a>`,
        ],
        ["no href", `<a name="anchor">x</a>`],
    ])("leaves %s links alone", (_name, html) => {
        const root = el(`<p>${html}</p>`);
        const before = root.innerHTML;
        convertLinksToFootnotes(root);

        expect(root.innerHTML).toBe(before);
        expect(root.querySelector("aside")).toBeNull();
    });

    describe("relative links", () => {
        it("are resolved against the page and become footnotes", () => {
            const root = el(`<p><a href="/local/page?x=1">x</a></p>`);
            convertLinksToFootnotes(root);

            const expected = new URL("/local/page?x=1", document.baseURI).href;
            expect(
                root
                    .querySelector("aside p > a:last-child")!
                    .getAttribute("href"),
            ).toBe(expected);
            expect(root.querySelector("p")!.textContent).toBe("x[1]");
        });

        it("on image links are made absolute without adding a footnote", () => {
            const root = el(
                `<a href="/gallery"><img src="https://a.test/i.png"></a>`,
            );
            convertLinksToFootnotes(root);

            expect(root.querySelector("a")!.getAttribute("href")).toBe(
                new URL("/gallery", document.baseURI).href,
            );
            expect(root.querySelector("aside")).toBeNull();
        });
    });

    describe("fragment links", () => {
        it.each([
            ["an id", `<h2 id="top">T</h2><a href="#top">x</a>`],
            ["a named anchor", `<a name="top"></a><a href="#top">x</a>`],
            ["an encoded id", `<h2 id="a b">T</h2><a href="#a%20b">x</a>`],
        ])("are kept when the target is %s", (_name, html) => {
            const root = el(html);
            convertLinksToFootnotes(root);

            expect(root.querySelector('a[href^="#"]')).not.toBeNull();
            expect(root.querySelector("aside")).toBeNull();
        });

        it.each([
            ["is missing", `<a href="#missing">x</a>`],
            ["is empty", `<a href="#">x</a>`],
        ])("are unwrapped to plain text when the target %s", (_name, html) => {
            const root = el(`<p>See ${html}.</p>`);
            convertLinksToFootnotes(root);

            expect(root.querySelector("a")).toBeNull();
            expect(root.querySelector("p")!.textContent).toBe("See x.");
        });

        it("keep their inner markup when unwrapped", () => {
            const root = el(`<p><a href="#missing">some <em>text</em></a></p>`);
            convertLinksToFootnotes(root);

            expect(root.querySelector("p > em")!.textContent).toBe("text");
        });
    });

    it("truncates long URLs in the footnote text but not in the href", () => {
        const url = "https://example.com/" + "a".repeat(200);
        const root = el(`<p><a href="${url}">x</a></p>`);
        convertLinksToFootnotes(root);

        const footnoteLink = root.querySelector("aside p > a:last-child")!;
        expect(footnoteLink.getAttribute("href")).toBe(url);
        expect(footnoteLink.textContent).toBe(url.substring(0, 100) + "...");
    });

    it("does not add an ellipsis to URLs of 100 chars or fewer", () => {
        const url = "https://example.com/" + "a".repeat(80);
        const root = el(`<p><a href="${url}">x</a></p>`);
        convertLinksToFootnotes(root);

        expect(root.querySelector("aside p > a:last-child")!.textContent).toBe(
            url,
        );
    });

    it("preserves inline markup inside the link text", () => {
        const root = el(
            `<p><a href="https://a.test">some <em>emphasised</em> text</a></p>`,
        );
        convertLinksToFootnotes(root);

        expect(root.querySelector("p em")?.textContent).toBe("emphasised");
    });
});

describe("sanitizeContent", () => {
    it.each([
        "script",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "button",
        "video",
        "audio",
    ])("removes <%s>", (tag) => {
        const root = el(`<p>keep</p><${tag}></${tag}>`);
        sanitizeContent(root);

        expect(root.querySelector(tag)).toBeNull();
        expect(root.querySelector("p")!.textContent).toBe("keep");
    });

    it("removes inline event handler attributes", () => {
        const root = el(
            `<p onclick="x()" onMouseOver="y()" class="c" id="p">t</p><a href="#" onfocus="z()">a</a>`,
        );
        sanitizeContent(root);

        const p = root.querySelector("p")!;
        expect(p.hasAttribute("onclick")).toBe(false);
        expect(p.hasAttribute("onmouseover")).toBe(false);
        expect(p.className).toBe("c");
        expect(root.querySelector("a")!.hasAttribute("onfocus")).toBe(false);
    });

    it("removes handlers on deeply nested elements", () => {
        const root = el(`<div><div><span onclick="x()">t</span></div></div>`);
        sanitizeContent(root);
        expect(root.querySelector("span")!.hasAttribute("onclick")).toBe(false);
    });

    it("neutralises javascript: URLs", () => {
        const root = el(`<a href="javascript:alert(1)">x</a>`);
        sanitizeContent(root);
        expect(root.querySelector("a")?.getAttribute("href") ?? "").not.toMatch(
            /^javascript:/i,
        );
    });
});

describe("getContentXhtml", () => {
    it("serialises to well-formed XML with the XHTML namespace", () => {
        const root = el(
            `<p>One<br>Two</p><img data-epub-src="images/image-1.png" alt="x">`,
        );
        const xhtml = getContentXhtml(root);

        const doc = new DOMParser().parseFromString(xhtml, "application/xml");
        expect(doc.querySelector("parsererror")).toBeNull();
        expect(xhtml).toContain("<br />");
    });

    it("renames data-epub-src back to src", () => {
        const root = el(`<img data-epub-src="images/image-1.png">`);
        const xhtml = getContentXhtml(root);

        expect(xhtml).toContain('src="images/image-1.png"');
        expect(xhtml).not.toContain("data-epub-src");
    });

    it("does not rewrite the literal text 'data-epub-src=' inside content", () => {
        const root = el(`<p>Use the data-epub-src= attribute</p>`);
        expect(getContentXhtml(root)).toContain("data-epub-src=");
    });
});

describe("createEpubData", () => {
    beforeEach(() => {
        document.title = "Test Page";
        document.body.innerHTML = `
            <header>Site nav</header>
            <article data-epub-id="abc">
                <h2>Heading</h2>
                <p onclick="x()">Text with <a href="https://example.com">a link</a>.</p>
                <img src="https://x.test/pic.png">
                <script>alert(1)</script>
            </article>`;
    });

    it("builds title, content and images from the marked root only", () => {
        const data = extractEpubData("abc");

        expect(data.title).toBe("Test Page");
        expect(data.images).toHaveLength(1);
        expect(data.images[0]!.url).toBe("https://x.test/pic.png");
        expect(data.content).toContain("Heading");
        expect(data.content).not.toContain("Site nav");
        expect(data.content).not.toContain("script");
        expect(data.content).not.toContain("onclick");
        expect(data.content).toContain('src="images/image-1.png"');
        expect(data.content).toContain('id="fn-1"');
    });

    it("escapes XML special characters in the title", () => {
        document.title = "Test Page <live>";

        const data = extractEpubData("abc");
        const testXml = `<?xml version="1.0" encoding="UTF-8"?>
            <data>
                <title>${data.title}</title>
            </data>`;
        const { error } = parseXml(testXml);
        expect(error, `${testXml} should be well-formed`).toBeNull();
    });

    it("does not mutate the live page", () => {
        extractEpubData("abc");
        const live = document.querySelector("article")!;

        expect(live.querySelector("script")).not.toBeNull();
        expect(live.querySelector("img")!.getAttribute("src")).toBe(
            "https://x.test/pic.png",
        );
        expect(live.querySelector("aside")).toBeNull();
    });
});
