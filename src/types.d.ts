export interface EpubImage {
    id: string;
    url: string;
    filename: string;
    mediaType: string;
}

export interface EpubLink {
    number: number;
    url: string;
}

export interface EpubData {
    title: string;
    content: string;
    images: EpubImage[];
}

export interface ContentMessage {
    action: "get_root_element_id" | "convert_page_to_epub" | "download_blob";
    data?: any;
}

export interface BackgroundMessage {
    action: "create_epub_from_data";
    data?: any;
}
