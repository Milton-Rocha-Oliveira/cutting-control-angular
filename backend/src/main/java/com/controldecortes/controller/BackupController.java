package com.controldecortes.controller;

import com.controldecortes.dto.ApiDtos.OfflineBackupResponse;
import com.controldecortes.service.CutService;
import com.controldecortes.service.SettlementService;
import com.controldecortes.service.SupplierService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/backup")
public class BackupController {
  private final SupplierService suppliers;
  private final CutService cuts;
  private final SettlementService settlements;

  public BackupController(SupplierService suppliers, CutService cuts, SettlementService settlements) {
    this.suppliers = suppliers;
    this.cuts = cuts;
    this.settlements = settlements;
  }

  @GetMapping
  public OfflineBackupResponse export() {
    return new OfflineBackupResponse(
      1,
      OffsetDateTime.now(ZoneOffset.UTC),
      suppliers.list(),
      cuts.list(null),
      settlements.report(OffsetDateTime.parse("1900-01-01T00:00:00Z"), OffsetDateTime.now(ZoneOffset.UTC).plusYears(50))
    );
  }
}
