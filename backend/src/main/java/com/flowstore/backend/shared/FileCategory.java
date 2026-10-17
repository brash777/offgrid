package com.flowstore.backend.shared;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

public enum FileCategory {

    PRODUCT_IMAGE("product-images", 5, true, FileType.JPEG, FileType.PNG, FileType.WEBP),
    AVATAR_PHOTO("avatar-photos", 5, false, FileType.JPEG, FileType.PNG),
    MODEL_3D("models", 20, true, FileType.GLB);

    private static final long BYTES_PER_MEGABYTE = 1024L * 1024L;

    private final String folder;
    private final int maxMegabytes;
    private final boolean publiclyServed;
    private final Set<FileType> acceptedTypes;

    FileCategory(String folder, int maxMegabytes, boolean publiclyServed, FileType... acceptedTypes) {
        this.folder = folder;
        this.maxMegabytes = maxMegabytes;
        this.publiclyServed = publiclyServed;
        this.acceptedTypes = EnumSet.copyOf(Arrays.asList(acceptedTypes));
    }

    public long maxBytes() {
        return maxMegabytes * BYTES_PER_MEGABYTE;
    }

    public boolean accepts(FileType type) {
        return acceptedTypes.contains(type);
    }

    public String acceptedExtensions() {
        return acceptedTypes.stream()
                .flatMap(type -> type.getExtensions().stream())
                .collect(Collectors.joining(", "));
    }

    public String getFolder() {
        return folder;
    }

    public int getMaxMegabytes() {
        return maxMegabytes;
    }

    public boolean isPubliclyServed() {
        return publiclyServed;
    }
}
