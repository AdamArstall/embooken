import { describe, expect, it } from "vitest";
import { escapeXml } from "../../src/modules/strings";

describe("escapeXml", () => {
    it.each([
        ["&", "&amp;"],
        ["<", "&lt;"],
        [">", "&gt;"],
        ['"', "&quot;"],
        ["'", "&apos;"],
    ])("escapes %j as %j", (input, expected) => {
        expect(escapeXml(input)).toBe(expected);
    });

    it("escapes every occurrence, not only the first", () => {
        expect(escapeXml("a & b & c")).toBe("a &amp; b &amp; c");
    });

    it("escapes ampersands first so other entities are not double-escaped", () => {
        expect(escapeXml("<a>")).toBe("&lt;a&gt;");
        expect(escapeXml("&lt;")).toBe("&amp;lt;");
    });

    it("escapes a mixed string", () => {
        expect(escapeXml(`Tom & "Jerry" <it's>`)).toBe(
            "Tom &amp; &quot;Jerry&quot; &lt;it&apos;s&gt;",
        );
    });

    it.each([[""], ["Plain text 123"], ["Unicode: café 日本語 🎉"]])(
        "leaves %j unchanged",
        (input) => {
            expect(escapeXml(input)).toBe(input);
        },
    );

    it("produces output that parses back to the original text", () => {
        const original = `5 < 6 && "quotes" 'apostrophes' > 4`;
        const xml = `<t>${escapeXml(original)}</t>`;
        const doc = new DOMParser().parseFromString(xml, "application/xml");

        expect(doc.querySelector("parsererror")).toBeNull();
        expect(doc.documentElement.textContent).toBe(original);
    });

    it("is safe inside attribute values", () => {
        const original = `a "b" & 'c' <d>`;
        const xml = `<t v="${escapeXml(original)}"/>`;
        const doc = new DOMParser().parseFromString(xml, "application/xml");

        expect(doc.querySelector("parsererror")).toBeNull();
        expect(doc.documentElement.getAttribute("v")).toBe(original);
    });
});
