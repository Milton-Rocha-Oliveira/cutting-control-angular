package com.controldecortes.service;

import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.stereotype.Component;

@Component
@Profile("!local")
public class DataEncryptionMigrationRunner implements SmartInitializingSingleton {
  private final DataEncryptionMigrationService migration;

  public DataEncryptionMigrationRunner(DataEncryptionMigrationService migration) {
    this.migration = migration;
  }

  @Override public void afterSingletonsInstantiated() {
    migration.encryptExistingData();
  }
}
