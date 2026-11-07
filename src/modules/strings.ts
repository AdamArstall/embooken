export function escapeXml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

export function parseXml(text: string) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return { doc, error: doc.querySelector("parsererror") };
}
