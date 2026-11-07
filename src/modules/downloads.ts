export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);

    // Create download link instead of using downloads API for better
    // compatibility
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
    a.remove();

    // Keep the URL alive briefly so the browser can consume it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
