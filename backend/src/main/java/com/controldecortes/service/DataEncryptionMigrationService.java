package com.controldecortes.service;

import com.controldecortes.domain.Cut;
import com.controldecortes.domain.Supplier;
import com.controldecortes.repository.CutRepository;
import com.controldecortes.repository.SettlementItemRepository;
import com.controldecortes.repository.SettlementRepository;
import com.controldecortes.repository.SupplierRepository;
import com.controldecortes.security.DataEncryptionService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DataEncryptionMigrationService {
  private static final String VERSION = "encrypted-columns-v1";
  private final JdbcTemplate jdbc;
  private final SupplierRepository suppliers;
  private final CutRepository cuts;
  private final SettlementRepository settlements;
  private final SettlementItemRepository items;
  private final DataEncryptionService encryption;

  public DataEncryptionMigrationService(JdbcTemplate jdbc, SupplierRepository suppliers, CutRepository cuts,
      SettlementRepository settlements, SettlementItemRepository items, DataEncryptionService encryption) {
    this.jdbc = jdbc;
    this.suppliers = suppliers;
    this.cuts = cuts;
    this.settlements = settlements;
    this.items = items;
    this.encryption = encryption;
  }

  @Transactional
  public void encryptExistingData() {
    Integer done = jdbc.queryForObject("select count(*) from app_data_migrations where version = ?", Integer.class, VERSION);
    if (done != null && done > 0) return;

    for (Supplier supplier : suppliers.findAll()) {
      jdbc.update("update suppliers set name=?, document=?, email=?, phone=?, document_fingerprint=? where id=?",
          encryption.encrypt(supplier.getName()), encryption.encrypt(supplier.getDocument()),
          encryption.encrypt(supplier.getEmail()), encryption.encrypt(supplier.getPhone()),
          documentFingerprint(supplier.getDocument()), supplier.getId());
    }
    for (Cut cut : cuts.findAll()) {
      jdbc.update("update cuts set cut_number=?, cut_number_fingerprint=?, description=?, packages=?, pieces_per_package=?, unit_price_per_piece=?, production_date=?, total_pieces=?, total_amount=?, billed_at=? where id=?",
          encryption.encrypt(cut.getCutNumber()), encryption.fingerprint("cut-number:" + cut.getSupplier().getId(), cut.getCutNumber()),
          encryption.encrypt(cut.getDescription()), enc(cut.getPackages()), enc(cut.getPiecesPerPackage()),
          enc(cut.getUnitPricePerPiece()), enc(cut.getProductionDate()), enc(cut.getTotalPieces()),
          enc(cut.getTotalAmount()), enc(cut.getBilledAt()), cut.getId());
    }
    settlements.findAll().forEach(settlement -> jdbc.update(
        "update settlements set total_amount=?, total_pieces=? where id=?",
        enc(settlement.getTotalAmount()), enc(settlement.getTotalPieces()), settlement.getId()));
    items.findAll().forEach(item -> jdbc.update(
        "update settlement_items set cut_number=?, description=?, packages=?, pieces_per_package=?, unit_price_per_piece=?, production_date=?, total_pieces=?, total_amount=? where id=?",
        enc(item.getCutNumber()), enc(item.getDescription()), enc(item.getPackages()), enc(item.getPiecesPerPackage()),
        enc(item.getUnitPricePerPiece()), enc(item.getProductionDate()), enc(item.getTotalPieces()),
        enc(item.getTotalAmount()), item.getId()));

    jdbc.update("alter table cuts alter column cut_number_fingerprint set not null");
    jdbc.update("insert into app_data_migrations(version) values (?)", VERSION);
  }

  private String documentFingerprint(String document) {
    if (document == null || document.isBlank()) return null;
    return encryption.fingerprint("supplier-document", document.replaceAll("[^0-9A-Za-z]", "").toLowerCase());
  }

  private String enc(Object value) { return value == null ? null : encryption.encrypt(value.toString()); }
}
