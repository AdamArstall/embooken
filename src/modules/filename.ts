export function createFileName(text: string, ext: string) {
    // Replace any characters not in the restricted set with -
    let fileName = text.replace(/[^\w\.\-\(\)+=!@£$%^&*' ]/g, "-");
    // Remove duplicate - characters
    return `${fileName.replaceAll(/--+/g, "-")}.${ext}`;
}
