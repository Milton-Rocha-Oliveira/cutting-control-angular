package com.controldecortes.security;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
@Converter
public class EncryptedLongConverter extends EncryptedConverterSupport implements AttributeConverter<Long, String> {
  @Override public String convertToDatabaseColumn(Long value) { return value == null ? null : encryption.encrypt(value.toString()); }
  @Override public Long convertToEntityAttribute(String value) { String plain = encryption.decrypt(value); return plain == null ? null : Long.valueOf(plain); }
}
