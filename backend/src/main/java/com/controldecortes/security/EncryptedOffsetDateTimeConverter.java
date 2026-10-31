package com.controldecortes.security;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.OffsetDateTime;
@Converter
public class EncryptedOffsetDateTimeConverter extends EncryptedConverterSupport implements AttributeConverter<OffsetDateTime, String> {
  @Override public String convertToDatabaseColumn(OffsetDateTime value) { return value == null ? null : encryption.encrypt(value.toString()); }
  @Override public OffsetDateTime convertToEntityAttribute(String value) {
    String plain = encryption.decrypt(value);
    if (plain == null) return null;
    // PostgreSQL's timestamptz::text uses a space and can shorten UTC offsets (+00).
    if (plain.length() > 10 && plain.charAt(10) == ' ') plain = plain.substring(0, 10) + 'T' + plain.substring(11);
    plain = plain.replaceFirst("([+-]\\d{2})$", "$1:00");
    return OffsetDateTime.parse(plain);
  }
}
