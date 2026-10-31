package com.controldecortes.security;

import org.springframework.beans.factory.annotation.Autowired;

abstract class EncryptedConverterSupport {
  @Autowired protected DataEncryptionService encryption;
}
