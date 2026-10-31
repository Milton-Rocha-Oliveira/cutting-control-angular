package com.controldecortes.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

/** Application-layer authenticated encryption. The key is supplied outside the database. */
@Component
public class DataEncryptionService {
  private static final String PREFIX = "ccenc:v1:";
  private static final byte[] AAD = "court-control:encrypted-field:v1".getBytes(StandardCharsets.UTF_8);
  private static final int NONCE_BYTES = 12;
  private static final SecureRandom RANDOM = new SecureRandom();

  @Value("${app.data-encryption-key:}") private String encodedKey;
  private SecretKeySpec encryptionKey;
  private SecretKeySpec fingerprintKey;

  @PostConstruct
  void initialize() {
    try {
      byte[] key = Base64.getDecoder().decode(encodedKey.trim());
      if (key.length != 32) throw new IllegalStateException("APP_DATA_ENCRYPTION_KEY deve conter exatamente 32 bytes em Base64");
      encryptionKey = new SecretKeySpec(key, "AES");
      Mac derivation = Mac.getInstance("HmacSHA256");
      derivation.init(new SecretKeySpec(key, "HmacSHA256"));
      fingerprintKey = new SecretKeySpec(derivation.doFinal("court-control:fingerprint:v1".getBytes(StandardCharsets.UTF_8)), "HmacSHA256");
      Arrays.fill(key, (byte) 0);
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException("APP_DATA_ENCRYPTION_KEY precisa ser uma chave Base64 válida de 32 bytes", e);
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException("Não foi possível preparar a chave de criptografia", e);
    }
  }

  public String encrypt(String plaintext) {
    if (plaintext == null) return null;
    byte[] nonce = new byte[NONCE_BYTES];
    RANDOM.nextBytes(nonce);
    try {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(128, nonce));
      cipher.updateAAD(AAD);
      byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
      byte[] payload = new byte[nonce.length + encrypted.length];
      System.arraycopy(nonce, 0, payload, 0, nonce.length);
      System.arraycopy(encrypted, 0, payload, nonce.length, encrypted.length);
      return PREFIX + Base64.getEncoder().withoutPadding().encodeToString(payload);
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException("Não foi possível criptografar um campo", e);
    }
  }

  /** Plaintext values are accepted only to let the startup migration encrypt pre-existing rows. */
  public String decrypt(String stored) {
    if (stored == null || !stored.startsWith(PREFIX)) return stored;
    try {
      byte[] payload = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
      if (payload.length <= NONCE_BYTES) throw new IllegalArgumentException("Campo criptografado inválido");
      byte[] nonce = Arrays.copyOfRange(payload, 0, NONCE_BYTES);
      byte[] encrypted = Arrays.copyOfRange(payload, NONCE_BYTES, payload.length);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(128, nonce));
      cipher.updateAAD(AAD);
      return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    } catch (GeneralSecurityException | IllegalArgumentException e) {
      throw new IllegalStateException("Não foi possível descriptografar os dados. Verifique a chave de dados e sua integridade", e);
    }
  }

  /** A stable keyed fingerprint preserves per-owner uniqueness without storing the original value. */
  public String fingerprint(String scope, String value) {
    if (value == null || value.isBlank()) return null;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(fingerprintKey);
      mac.update(scope.getBytes(StandardCharsets.UTF_8));
      mac.update((byte) 0);
      mac.update(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(mac.doFinal());
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException("Não foi possível calcular a impressão digital do dado", e);
    }
  }
}
