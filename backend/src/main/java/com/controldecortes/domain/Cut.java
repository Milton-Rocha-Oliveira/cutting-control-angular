package com.controldecortes.domain;

import jakarta.persistence.*;
import com.controldecortes.security.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cuts")
public class Cut {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "supplier_id", nullable = false) private Supplier supplier;
  @Convert(converter = EncryptedStringConverter.class) @Column(name = "cut_number", nullable = false, length = 512) private String cutNumber;
  @Column(name = "cut_number_fingerprint", nullable = false, length = 64) private String cutNumberFingerprint;
  @Convert(converter = EncryptedStringConverter.class) @Column(nullable = false, length = 1024) private String description;
  @Convert(converter = EncryptedIntegerConverter.class) @Column(nullable = false, length = 64) private Integer packages;
  @Convert(converter = EncryptedIntegerConverter.class) @Column(name = "pieces_per_package", nullable = false, length = 64) private Integer piecesPerPackage;
  @Convert(converter = EncryptedBigDecimalConverter.class) @Column(name = "unit_price_per_piece", nullable = false, length = 128) private BigDecimal unitPricePerPiece;
  @Convert(converter = EncryptedLocalDateConverter.class) @Column(name = "production_date", nullable = false, length = 64) private LocalDate productionDate;
  @Convert(converter = EncryptedLongConverter.class) @Column(name = "total_pieces", nullable = false, length = 64) private Long totalPieces;
  @Convert(converter = EncryptedBigDecimalConverter.class) @Column(name = "total_amount", nullable = false, length = 128) private BigDecimal totalAmount;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private ActiveStatus status = ActiveStatus.ACTIVE;
  @Convert(converter = EncryptedOffsetDateTimeConverter.class) @Column(name = "billed_at", length = 128) private OffsetDateTime billedAt;
  @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt = OffsetDateTime.now();
  @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt = OffsetDateTime.now();

  public Cut() {}
  public Cut(Supplier supplier, String cutNumber, String description, Integer packages, Integer piecesPerPackage,
             BigDecimal unitPricePerPiece, LocalDate productionDate) {
    this.supplier = supplier; this.cutNumber = cutNumber; this.description = description;
    this.packages = packages; this.piecesPerPackage = piecesPerPackage;
    this.unitPricePerPiece = unitPricePerPiece; this.productionDate = productionDate; calculateTotals();
  }

  @PrePersist @PreUpdate
  void beforeSave() { calculateTotals(); updatedAt = OffsetDateTime.now(); }
  public void calculateTotals() {
    if (packages != null && piecesPerPackage != null && unitPricePerPiece != null) {
      totalPieces = Math.multiplyExact(packages.longValue(), piecesPerPackage.longValue());
      totalAmount = unitPricePerPiece.multiply(BigDecimal.valueOf(totalPieces)).setScale(2, java.math.RoundingMode.HALF_UP);
    }
  }
  public Long getId(){return id;} public Supplier getSupplier(){return supplier;} public void setSupplier(Supplier v){supplier=v;}
  public String getCutNumber(){return cutNumber;} public void setCutNumber(String v){cutNumber=v;} public String getCutNumberFingerprint(){return cutNumberFingerprint;} public void setCutNumberFingerprint(String v){cutNumberFingerprint=v;}
  public String getDescription(){return description;} public void setDescription(String v){description=v;}
  public Integer getPackages(){return packages;} public void setPackages(Integer v){packages=v;}
  public Integer getPiecesPerPackage(){return piecesPerPackage;} public void setPiecesPerPackage(Integer v){piecesPerPackage=v;}
  public BigDecimal getUnitPricePerPiece(){return unitPricePerPiece;} public void setUnitPricePerPiece(BigDecimal v){unitPricePerPiece=v;}
  public LocalDate getProductionDate(){return productionDate;} public void setProductionDate(LocalDate v){productionDate=v;}
  public Long getTotalPieces(){return totalPieces;} public BigDecimal getTotalAmount(){return totalAmount;}
  public ActiveStatus getStatus(){return status;} public void setStatus(ActiveStatus v){status=v;}
  public boolean isActive(){return status == ActiveStatus.ACTIVE;} public void setActive(boolean v){status = v ? ActiveStatus.ACTIVE : ActiveStatus.INACTIVE;}
  public OffsetDateTime getBilledAt(){return billedAt;} public void setBilledAt(OffsetDateTime v){billedAt=v;}
}
