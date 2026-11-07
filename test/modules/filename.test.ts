import { describe, expect, it } from "vitest";
import { createFileName } from "../../src/modules/filename";

describe("createFileName", () => {
    it.each([
        ["Simple Title", "Simple Title.epub"],
        ["Hello (World) - 2024", "Hello (World) - 2024.epub"],
        ["a/b\\c:d", "a-b-c-d.epub"],
        ["What? Why*", "What- Why*.epub"],
        ["emoji 🎉 title", "emoji - title.epub"],
        ["", ".epub"],
    ])("%j -> %j", (input, expected) => {
        expect(createFileName(input, "epub")).toBe(expected);
    });

    it("uses the supplied extension", () => {
        expect(createFileName("x", "txt")).toBe("x.txt");
    });

    it("never leaves path separators in the name", () => {
        expect(createFileName("../../etc/passwd", "epub")).not.toMatch(/[\\/]/);
    });

    it("collapses every run of dashes, not only the first", () => {
        expect(createFileName("a//b//c", "epub")).toBe("a-b-c.epub");
    });
});
