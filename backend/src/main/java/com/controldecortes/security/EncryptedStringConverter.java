package com.controldecortes.security;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
@Converter
public class EncryptedStringConverter extends EncryptedConverterSupport implements AttributeConverter<String, String> {
  @Override public String convertToDatabaseColumn(String value) { return encryption.encrypt(value); }
  @Override public String convertToEntityAttribute(String value) { return encryption.decrypt(value); }
}
