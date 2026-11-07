import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleContentMessage } from "../../src/modules/content-handler";

const sendMessage = vi.fn();

beforeEach(() => {
    sendMessage.mockReset();
    vi.stubGlobal("browser", { runtime: { sendMessage } });
    vi.stubGlobal("alert", vi.fn());
    document.title = "Test Page";
    document.body.innerHTML = "";
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("get_root_element_id", () => {
    it("success true when compatible", async () => {
        document.body.innerHTML = `<article><p>Hi</p></article>`;
        const result = await handleContentMessage({
            action: "get_root_element_id",
        });
        expect(result.success).toEqual(true);
        expect(result.rootId).toBeDefined();
    });

    it("fails when the page has no <article>", async () => {
        document.body.innerHTML = `<div>No article</div>`;
        const result = await handleContentMessage({
            action: "get_root_element_id",
        });
        expect(result.success).toEqual(false);
    });
});

describe("convert_to_epub", () => {
    it("alerts and fails when rootId is missing", async () => {
        const result = await handleContentMessage({
            action: "convert_page_to_epub",
            data: {},
        });

        expect(result).toEqual({
            success: false,
            error: "Page not compatible",
        });
        expect(alert).toHaveBeenCalledWith("Page not compatible!");
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it("reports failure and logs when the marked element cannot be found", async () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        document.body.innerHTML = `<article>no marker</article>`;

        const result = await handleContentMessage({
            action: "convert_page_to_epub",
            data: { rootId: "does-not-exist" },
        });

        expect(result).toEqual({ success: false, error: "Script failed" });
        expect(consoleError).toHaveBeenCalled();
        expect(sendMessage).not.toHaveBeenCalled();
    });
});
