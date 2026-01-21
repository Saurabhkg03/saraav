import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type as string, // Preserve original type if possible, or default to jpeg/png
        initialQuality: 0.8, // Good balance
    };

    try {
        const compressedFile = await imageCompression(file, options);
        // If compression somehow results in larger file (rare but possible with very small images), return original
        if (compressedFile.size > file.size) {
            return file;
        }
        return compressedFile;
    } catch (error) {
        console.warn("Image compression failed, using original file:", error);
        return file;
    }
};
