package com.controldecortes.service;

import com.controldecortes.domain.ActiveStatus;
import com.controldecortes.domain.Cut;
import com.controldecortes.domain.Supplier;
import com.controldecortes.dto.ApiDtos.CutRequest;
import com.controldecortes.dto.ApiDtos.CutResponse;
import com.controldecortes.exception.ApiException;
import com.controldecortes.repository.CutRepository;
import com.controldecortes.security.DataEncryptionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class CutService {
  private final CutRepository repo;
  private final SupplierService suppliers;
  private final DataEncryptionService encryption;

  public CutService(CutRepository repo, SupplierService suppliers, DataEncryptionService encryption) {
    this.repo = repo;
    this.suppliers = suppliers;
    this.encryption = encryption;
  }

  public List<CutResponse> list(Long supplierId) {
    String owner = CurrentUser.id();
    var cuts = supplierId == null ? repo.findAllForOwner(owner) : repo.findForOwnerAndSupplier(supplierId, owner);
    return cuts.stream().map(this::out)
      .sorted(Comparator.comparing(CutResponse::productionDate).reversed().thenComparing(CutResponse::cutNumber))
      .toList();
  }

  public List<CutResponse> activeBySupplier(Long supplierId) {
    suppliers.get(supplierId);
    return repo.findActiveForOwner(supplierId, CurrentUser.id(), ActiveStatus.ACTIVE).stream().map(this::out)
      .sorted(Comparator.comparing(CutResponse::productionDate).reversed().thenComparing(CutResponse::cutNumber))
      .toList();
  }

  @Transactional
  public CutResponse create(CutRequest request) {
    Supplier supplier = suppliers.get(request.supplierId());
    if (!supplier.isActive()) throw new ApiException(HttpStatus.CONFLICT, "Fornecedor inativo não pode receber cortes");
    String cutNumber = request.cutNumber().trim();
    Cut cut = new Cut(supplier, cutNumber, request.description().trim(), request.packages(), request.piecesPerPackage(), request.unitPricePerPiece(), request.productionDate());
    cut.setCutNumberFingerprint(cutFingerprint(supplier.getId(), cutNumber));
    return out(repo.save(cut));
  }

  @Transactional
  public CutResponse update(Long id, CutRequest request) {
    Cut cut = get(id);
    if (!cut.isActive()) throw new ApiException(HttpStatus.CONFLICT, "Corte inativo não pode ser editado");
    Supplier supplier = suppliers.get(request.supplierId());
    if (!supplier.isActive()) throw new ApiException(HttpStatus.CONFLICT, "Fornecedor inativo");
    String cutNumber = request.cutNumber().trim();
    cut.setSupplier(supplier);
    cut.setCutNumber(cutNumber);
    cut.setCutNumberFingerprint(cutFingerprint(supplier.getId(), cutNumber));
    cut.setDescription(request.description().trim());
    cut.setPackages(request.packages());
    cut.setPiecesPerPackage(request.piecesPerPackage());
    cut.setUnitPricePerPiece(request.unitPricePerPiece());
    cut.setProductionDate(request.productionDate());
    return out(repo.save(cut));
  }

  @Transactional public CutResponse setStatus(Long id, ActiveStatus status) {
    Cut cut = get(id);
    if (status == ActiveStatus.ACTIVE && cut.getBilledAt() != null) throw new ApiException(HttpStatus.CONFLICT, "Corte faturado não pode ser reativado");
    cut.setStatus(status);
    return out(repo.save(cut));
  }

  @Transactional public CutResponse setActive(Long id, boolean active) { return setStatus(id, active ? ActiveStatus.ACTIVE : ActiveStatus.INACTIVE); }
  @Transactional public void delete(Long id) { Cut cut = get(id); if (!cut.isActive()) throw new ApiException(HttpStatus.CONFLICT, "Corte inativo não pode ser excluído"); repo.delete(cut); }

  public Cut get(Long id) {
    Cut cut = repo.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Corte não encontrado"));
    if (!CurrentUser.id().equals(cut.getSupplier().getOwnerId())) throw new ApiException(HttpStatus.NOT_FOUND, "Corte não encontrado");
    return cut;
  }

  public CutResponse out(Cut cut) {
    return new CutResponse(cut.getId(), cut.getSupplier().getId(), cut.getSupplier().getName(), cut.getCutNumber(), cut.getDescription(),
      cut.getPackages(), cut.getPiecesPerPackage(), cut.getUnitPricePerPiece(), cut.getProductionDate(), cut.getTotalPieces(), cut.getTotalAmount(), cut.getStatus(), cut.getBilledAt());
  }

  private String cutFingerprint(Long supplierId, String cutNumber) { return encryption.fingerprint("cut-number:" + supplierId, cutNumber); }
}
