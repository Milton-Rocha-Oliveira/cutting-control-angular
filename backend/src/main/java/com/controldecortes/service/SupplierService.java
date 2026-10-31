package com.controldecortes.service;
import com.controldecortes.domain.Supplier;
import com.controldecortes.dto.ApiDtos.*;
import com.controldecortes.exception.ApiException;
import com.controldecortes.repository.SupplierRepository;
import com.controldecortes.security.DataEncryptionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Comparator;
import java.util.List;

@Service
public class SupplierService {
  private final SupplierRepository repo;
  private final DataEncryptionService encryption;

  public SupplierService(SupplierRepository r, DataEncryptionService encryption) { repo = r; this.encryption = encryption; }

  public List<SupplierResponse> list() {
    return repo.findAllByOwnerIdOrderByNameAsc(CurrentUser.id()).stream().map(this::out)
      .sorted(Comparator.comparing(SupplierResponse::name, String.CASE_INSENSITIVE_ORDER)).toList();
  }

  @Transactional public SupplierResponse create(SupplierRequest r) {
    Supplier s = new Supplier(r.name().trim(), clean(r.document()), clean(r.email()), clean(r.phone()));
    s.setOwnerId(CurrentUser.id());
    s.setDocumentFingerprint(documentFingerprint(s.getDocument()));
    return out(repo.save(s));
  }

  @Transactional public SupplierResponse update(Long id, SupplierRequest r) {
    Supplier s = get(id);
    if (!s.isActive()) throw new ApiException(HttpStatus.CONFLICT, "Fornecedor inativo não pode ser editado");
    s.setName(r.name().trim()); s.setDocument(clean(r.document())); s.setEmail(clean(r.email())); s.setPhone(clean(r.phone()));
    s.setDocumentFingerprint(documentFingerprint(s.getDocument()));
    return out(repo.save(s));
  }

  @Transactional public SupplierResponse setActive(Long id, boolean v) { Supplier s = get(id); s.setActive(v); return out(repo.save(s)); }
  @Transactional public void delete(Long id) { Supplier s = get(id); if (!s.isActive()) throw new ApiException(HttpStatus.CONFLICT, "Fornecedor inativo não pode ser excluído"); repo.delete(s); }

  public Supplier get(Long id) { return repo.findByIdAndOwnerId(id, CurrentUser.id()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Fornecedor não encontrado")); }
  public SupplierResponse out(Supplier s) { return new SupplierResponse(s.getId(), s.getName(), s.getDocument(), s.getEmail(), s.getPhone(), s.isActive(), s.getCreatedAt()); }
  private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
  private String documentFingerprint(String document) {
    if (document == null) return null;
    String normalized = document.replaceAll("[^0-9A-Za-z]", "").toLowerCase();
    return encryption.fingerprint("supplier-document", normalized);
  }
}
