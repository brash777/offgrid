package com.flowstore.backend.shared;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public enum FileType {

    JPEG("jpg", List.of("jpg", "jpeg"), Signature.bytes(0, 0xFF, 0xD8, 0xFF)),
    PNG("png", List.of("png"), Signature.bytes(0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)),
    WEBP("webp", List.of("webp"), Signature.ascii(0, "RIFF"), Signature.ascii(8, "WEBP")),
    GLB("glb", List.of("glb"), Signature.ascii(0, "glTF"));

    private final String canonicalExtension;
    private final List<String> extensions;
    private final List<Signature> signatures;

    FileType(String canonicalExtension, List<String> extensions, Signature... signatures) {
        this.canonicalExtension = canonicalExtension;
        this.extensions = extensions;
        this.signatures = List.of(signatures);
    }

    public static Optional<FileType> fromExtension(String extension) {
        return Arrays.stream(values())
                .filter(type -> type.extensions.contains(extension))
                .findFirst();
    }

    public boolean matchesSignature(byte[] header) {
        return signatures.stream().allMatch(signature -> signature.matches(header));
    }

    public String getCanonicalExtension() {
        return canonicalExtension;
    }

    public List<String> getExtensions() {
        return extensions;
    }

    private static final class Signature {

        private final int offset;
        private final byte[] expected;

        private Signature(int offset, byte[] expected) {
            this.offset = offset;
            this.expected = expected;
        }

        static Signature bytes(int offset, int... values) {
            byte[] expected = new byte[values.length];
            for (int i = 0; i < values.length; i++) {
                expected[i] = (byte) values[i];
            }
            return new Signature(offset, expected);
        }

        static Signature ascii(int offset, String text) {
            return new Signature(offset, text.getBytes(StandardCharsets.US_ASCII));
        }

        boolean matches(byte[] header) {
            int end = offset + expected.length;
            return header.length >= end && Arrays.equals(header, offset, end, expected, 0, expected.length);
        }
    }
}
