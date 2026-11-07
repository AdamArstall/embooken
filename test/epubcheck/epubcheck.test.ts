import { spawnSync } from "node:child_process";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { createEpubFromData } from "../../src/modules/epub";
import { handleContentMessage } from "../../src/modules/content-handler";
import { extractEpubData } from "../../src/modules/extract";
import { createImageFetchStub } from "../doubles/fetch";

const projectRoot = resolve(import.meta.dirname, "../..");
const jarPath = join(
    projectRoot,
    "tools/epubcheck/epubcheck-5.4.0/epubcheck.jar",
);
const fixturesDir = join(projectRoot, "test/fixtures/pages");

interface EpubCheckMessage {
    ID: string;
    severity: string;
    message: string;
    locations: { path: string; line: number; column: number }[];
}

let outputDir: string;

beforeAll(() => {
    if (!existsSync(jarPath)) {
        throw new Error(
            "EPUBCheck is not installed. Run `npm run epubcheck:install` first.",
        );
    }
    // Set EPUBCHECK_OUT_DIR to keep the generated books for inspection.
    outputDir =
        process.env["EPUBCHECK_OUT_DIR"] ??
        mkdtempSync(join(tmpdir(), "embooken-epubcheck-"));
    mkdirSync(outputDir, { recursive: true });
});

afterAll(() => {
    if (outputDir && !process.env["EPUBCHECK_OUT_DIR"]) {
        rmSync(outputDir, { recursive: true, force: true });
    }
});

beforeEach(() => {
    vi.stubGlobal("fetch", createImageFetchStub());
});

function loadFixture(name: string) {
    const html = readFileSync(join(fixturesDir, name), "utf8");
    const parsed = new DOMParser().parseFromString(html, "text/html");
    document.documentElement.innerHTML = parsed.documentElement.innerHTML;
}

async function buildEpubFromFixture(name: string, outputFile: string) {
    loadFixture(name);

    // Go through the same message handler the popup uses.
    const found = (await handleContentMessage({
        action: "get_root_element_id",
    })) as { success: boolean; rootId?: string };
    expect(found.success, `${name} should contain a single <article>`).toBe(
        true,
    );

    const data = await createEpubFromData(extractEpubData(found.rootId!));
    writeFileSync(outputFile, new Uint8Array(data));
}

function runEpubCheck(epubPath: string): EpubCheckMessage[] {
    const jsonPath = `${epubPath}.json`;
    const result = spawnSync(
        "java",
        ["-jar", jarPath, epubPath, "--json", jsonPath],
        { encoding: "utf8" },
    );

    if (result.error) {
        throw new Error(`Could not run java: ${result.error.message}`);
    }
    if (!existsSync(jsonPath)) {
        throw new Error(
            `EPUBCheck produced no report.\n${result.stdout}\n${result.stderr}`,
        );
    }

    const report = JSON.parse(readFileSync(jsonPath, "utf8"));
    return report.messages ?? [];
}

function formatMessages(messages: EpubCheckMessage[]) {
    return messages
        .map((m) => {
            const where = m.locations
                .map((l) => `${l.path}:${l.line}:${l.column}`)
                .join(", ");
            return `[${m.severity}] ${m.ID}: ${m.message}${where ? `\n    at ${where}` : ""}`;
        })
        .join("\n");
}

const fixtures = readdirSync(fixturesDir).filter((f) => f.endsWith(".html"));

async function validateFixture(fixture: string) {
    const epubPath = join(outputDir, fixture.replace(/\.html$/, ".epub"));
    await buildEpubFromFixture(fixture, epubPath);

    const problems = runEpubCheck(epubPath).filter((m) =>
        ["FATAL", "ERROR", "WARNING"].includes(m.severity),
    );

    expect(problems, formatMessages(problems)).toEqual([]);
}

describe("EPUBCheck conformance", () => {
    it("found fixture pages", () => {
        expect(fixtures.length).toBeGreaterThan(0);
    });

    it.each(fixtures)("%s produces a valid EPUB", (fixture) =>
        validateFixture(fixture),
    );
});
