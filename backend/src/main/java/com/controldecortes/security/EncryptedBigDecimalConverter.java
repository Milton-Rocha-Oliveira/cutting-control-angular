package com.controldecortes.security;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.math.BigDecimal;
@Converter
public class EncryptedBigDecimalConverter extends EncryptedConverterSupport implements AttributeConverter<BigDecimal, String> {
  @Override public String convertToDatabaseColumn(BigDecimal value) { return value == null ? null : encryption.encrypt(value.toPlainString()); }
  @Override public BigDecimal convertToEntityAttribute(String value) { String plain = encryption.decrypt(value); return plain == null ? null : new BigDecimal(plain); }
}
