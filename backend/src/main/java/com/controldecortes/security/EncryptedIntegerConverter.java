package com.controldecortes.security;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
@Converter
public class EncryptedIntegerConverter extends EncryptedConverterSupport implements AttributeConverter<Integer, String> {
  @Override public String convertToDatabaseColumn(Integer value) { return value == null ? null : encryption.encrypt(value.toString()); }
  @Override public Integer convertToEntityAttribute(String value) { String plain = encryption.decrypt(value); return plain == null ? null : Integer.valueOf(plain); }
}
