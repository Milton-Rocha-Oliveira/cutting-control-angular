package com.example.cutcontrol.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cuts", uniqueConstraints = @UniqueConstraint(columnNames = {"supplier_id","cut_number"}))
public class Cut {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @NotNull
    @Column(name = "cut_number", nullable = false)
    private String cutNumber;

    @Min(0)
    private Integer packages;

    @Min(0)
    private Integer piecesPerPackage;

    @NotNull
    private BigDecimal piecePrice;

    private Integer totalPieces;

    private BigDecimal totalValue;

    private OffsetDateTime productionDate;

    @Column(nullable = false)
    private Boolean active = true; // true = active (not invoiced)

    private OffsetDateTime createdAt = OffsetDateTime.now();
    private OffsetDateTime updatedAt = OffsetDateTime.now();
    private OffsetDateTime invoicedAt;
    private String invoicedBy;

    @PrePersist
    @PreUpdate
    public void recalculate() {
        if (packages == null) packages = 0;
        if (piecesPerPackage == null) piecesPerPackage = 0;
        int tp = packages * piecesPerPackage;
        this.totalPieces = tp;
        if (piecePrice == null) piecePrice = BigDecimal.ZERO;
        this.totalValue = piecePrice.multiply(BigDecimal.valueOf(tp));
        this.updatedAt = OffsetDateTime.now();
    }

    // getters and setters omitted for brevity but should be added

    public Long getId() { return id; }
    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }
    public String getCutNumber() { return cutNumber; }
    public void setCutNumber(String cutNumber) { this.cutNumber = cutNumber; }
    public Integer getPackages() { return packages; }
    public void setPackages(Integer packages) { this.packages = packages; }
    public Integer getPiecesPerPackage() { return piecesPerPackage; }
    public void setPiecesPerPackage(Integer piecesPerPackage) { this.piecesPerPackage = piecesPerPackage; }
    public BigDecimal getPiecePrice() { return piecePrice; }
    public void setPiecePrice(BigDecimal piecePrice) { this.piecePrice = piecePrice; }
    public Integer getTotalPieces() { return totalPieces; }
    public BigDecimal getTotalValue() { return totalValue; }
    public OffsetDateTime getProductionDate() { return productionDate; }
    public void setProductionDate(OffsetDateTime productionDate) { this.productionDate = productionDate; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public OffsetDateTime getInvoicedAt() { return invoicedAt; }
    public void setInvoicedAt(OffsetDateTime invoicedAt) { this.invoicedAt = invoicedAt; }
    public String getInvoicedBy() { return invoicedBy; }
    public void setInvoicedBy(String invoicedBy) { this.invoicedBy = invoicedBy; }
}
