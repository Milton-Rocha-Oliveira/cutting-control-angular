package com.controldecortes.service;

import com.controldecortes.domain.*;
import com.controldecortes.dto.ApiDtos.*;
import com.controldecortes.exception.ApiException;
import com.controldecortes.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class SettlementService {
  private final SettlementRepository repo;
  private final CutRepository cuts;
  private final SupplierService suppliers;

  public SettlementService(SettlementRepository r, CutRepository c, SupplierService s) {
    repo = r;
    cuts = c;
    suppliers = s;
  }

  @Transactional
  public SettlementResponse create(SettlementRequest request) {
    String ownerId = CurrentUser.id();
    Supplier supplier = suppliers.get(request.supplierId());
    if (!supplier.isActive()) {
      throw new ApiException(HttpStatus.CONFLICT, "Fornecedor inativo não pode ser faturado");
    }

    Set<Long> ids = new HashSet<>();
    for (SettlementItemRequest item : request.items()) {
      if (!ids.add(item.cutId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "O mesmo corte foi selecionado mais de uma vez");
      }
    }

    Settlement settlement = new Settlement();
    settlement.setSupplier(supplier);
    settlement.setCreatedBy(ownerId);
    settlement.setInvoiceNumber("FAT-" + OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"))
      + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());

    BigDecimal total = BigDecimal.ZERO;
    long pieces = 0;
    OffsetDateTime billedAt = OffsetDateTime.now();

    for (SettlementItemRequest itemRequest : request.items().stream()
      .sorted(Comparator.comparing(SettlementItemRequest::cutId)).toList()) {
      Cut cut = cuts.findByIdForUpdate(itemRequest.cutId())
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Corte não encontrado"));

      if (!ownerId.equals(cut.getSupplier().getOwnerId())) {
        throw new ApiException(HttpStatus.NOT_FOUND, "Corte não encontrado");
      }
      if (!cut.isActive()) {
        throw new ApiException(HttpStatus.CONFLICT, "Corte já faturado ou inativo: " + cut.getCutNumber());
      }
      if (!cut.getSupplier().getId().equals(supplier.getId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Todos os cortes devem pertencer ao fornecedor");
      }

      cut.setStatus(ActiveStatus.INACTIVE);
      cut.setBilledAt(billedAt);

      SettlementItem item = new SettlementItem();
      item.setCut(cut);
      item.setCutNumber(cut.getCutNumber());
      item.setDescription(cut.getDescription());
      item.setPackages(cut.getPackages());
      item.setPiecesPerPackage(cut.getPiecesPerPackage());
      item.setUnitPricePerPiece(cut.getUnitPricePerPiece());
      item.setProductionDate(cut.getProductionDate());
      item.setTotalPieces(cut.getTotalPieces());
      item.setTotalAmount(cut.getTotalAmount());
      settlement.addItem(item);

      total = total.add(cut.getTotalAmount());
      pieces += cut.getTotalPieces();
    }

    settlement.setTotalPieces(pieces);
    settlement.setTotalAmount(total.setScale(2, RoundingMode.HALF_UP));
    return out(repo.save(settlement));
  }

  @Transactional(readOnly = true)
  public List<SettlementResponse> recent() {
    return repo.findTop50BySupplierOwnerIdOrderBySettledAtDesc(CurrentUser.id()).stream()
      .map(this::out).toList();
  }

  @Transactional(readOnly = true)
  public List<SettlementResponse> report(OffsetDateTime from, OffsetDateTime to) {
    if (from == null || to == null || !from.isBefore(to)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Período do relatório inválido");
    }
    return repo.findBySupplierOwnerIdAndSettledAtBetweenOrderBySettledAtDesc(CurrentUser.id(), from, to)
      .stream().map(this::out).toList();
  }

  @Transactional(readOnly = true)
  public String reportCsv(OffsetDateTime from, OffsetDateTime to) {
    StringBuilder csv = new StringBuilder(
      "fatura,fornecedor,corte,descricao,data_producao,pacotes,pecas_por_pacote,total_pecas,preco_por_peca,total\n");
    for (Settlement settlement : repo.findBySupplierOwnerIdAndSettledAtBetweenOrderBySettledAtDesc(CurrentUser.id(), from, to)) {
      for (SettlementItem item : settlement.getItems()) {
        csv.append(csv(settlement.getInvoiceNumber())).append(',')
          .append(csv(settlement.getSupplier().getName())).append(',')
          .append(csv(item.getCutNumber())).append(',')
          .append(csv(item.getDescription())).append(',')
          .append(item.getProductionDate()).append(',')
          .append(item.getPackages()).append(',')
          .append(item.getPiecesPerPackage()).append(',')
          .append(item.getTotalPieces()).append(',')
          .append(item.getUnitPricePerPiece()).append(',')
          .append(item.getTotalAmount()).append('\n');
      }
    }
    return csv.toString();
  }

  private String csv(String value) {
    return "\"" + value.replace("\"", "\"\"") + "\"";
  }

  public SettlementResponse out(Settlement settlement) {
    return new SettlementResponse(
      settlement.getId(),
      settlement.getInvoiceNumber(),
      settlement.getSupplier().getId(),
      settlement.getSupplier().getName(),
      settlement.getSettledAt(),
      settlement.getTotalPieces(),
      settlement.getTotalAmount(),
      settlement.getCreatedBy(),
      settlement.getItems().stream()
        .map(item -> new SettlementItemResponse(
          item.getCut().getId(), item.getCutNumber(), item.getDescription(),
          item.getPackages(), item.getPiecesPerPackage(), item.getUnitPricePerPiece(),
          item.getProductionDate(), item.getTotalPieces(), item.getTotalAmount()))
        .toList()
    );
  }
}
