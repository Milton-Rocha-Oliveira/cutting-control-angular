package com.controldecortes.security;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.LocalDate;
@Converter
public class EncryptedLocalDateConverter extends EncryptedConverterSupport implements AttributeConverter<LocalDate, String> {
  @Override public String convertToDatabaseColumn(LocalDate value) { return value == null ? null : encryption.encrypt(value.toString()); }
  @Override public LocalDate convertToEntityAttribute(String value) { String plain = encryption.decrypt(value); return plain == null ? null : LocalDate.parse(plain); }
}
