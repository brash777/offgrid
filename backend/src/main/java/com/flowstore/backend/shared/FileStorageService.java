package com.flowstore.backend.shared;

import com.flowstore.backend.config.FlowProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;

@Service
public class FileStorageService {

    public static final String PUBLIC_URL_PREFIX = "/files";

    private static final int HEADER_LENGTH = 12;

    private final Path root;

    public FileStorageService(FlowProperties properties) {
        this.root = properties.storage().root();
        for (FileCategory category : FileCategory.values()) {
            createFolder(root.resolve(category.getFolder()));
        }
    }

    public String store(MultipartFile file, FileCategory category) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("FILE_EMPTY");
        }
        if (file.getSize() > category.maxBytes()) {
            throw ApiException.payloadTooLarge("FILE_TOO_LARGE", category.getMaxMegabytes());
        }

        FileType type = FileType.fromExtension(extensionOf(file.getOriginalFilename()))
                .filter(category::accepts)
                .orElseThrow(() -> ApiException.badRequest("FILE_TYPE_INVALID", category.acceptedExtensions()));

        if (!type.matchesSignature(readHeader(file))) {
            throw ApiException.badRequest("FILE_CONTENT_INVALID");
        }

        String relativePath = category.getFolder() + "/" + UUID.randomUUID() + "." + type.getCanonicalExtension();
        copy(file, root.resolve(relativePath));
        return relativePath;
    }

    public String publicUrl(String relativePath) {
        return PUBLIC_URL_PREFIX + "/" + relativePath;
    }

    private static void createFolder(Path folder) {
        try {
            Files.createDirectories(folder);
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not create storage folder " + folder, ex);
        }
    }

    private static byte[] readHeader(MultipartFile file) {
        try (InputStream input = file.getInputStream()) {
            return input.readNBytes(HEADER_LENGTH);
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not read uploaded file", ex);
        }
    }

    private static void copy(MultipartFile file, Path destination) {
        try (InputStream input = file.getInputStream()) {
            Files.copy(input, destination);
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not store uploaded file", ex);
        }
    }

    private static String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
