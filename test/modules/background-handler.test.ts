import { describe, expect, it } from "vitest";
import { handleBackgroundMessage } from "../../src/modules/background-handler";
import type { EpubData } from "../../src/types";
import { makeEpubData } from "../helpers/test-data-helper";

describe("create_epub_from_data", () => {
    it("returns data and filename when input valid", async () => {
        const epubData: EpubData = makeEpubData();
        const result = await handleBackgroundMessage({
            action: "create_epub_from_data",
            data: epubData,
        });
        expect(Array.isArray(result.data)).toEqual(true);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.filename).toBeTruthy();
    });
});
