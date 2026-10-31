package com.controldecortes.domain;

import jakarta.persistence.*;
import com.controldecortes.security.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name = "settlement_items")
public class SettlementItem {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "settlement_id") private Settlement settlement;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cut_id") private Cut cut;
  @Convert(converter = EncryptedStringConverter.class) @Column(name = "cut_number", nullable = false, length = 512) private String cutNumber;
  @Convert(converter = EncryptedStringConverter.class) @Column(nullable = false, length = 1024) private String description;
  @Convert(converter = EncryptedIntegerConverter.class) @Column(nullable = false, length = 64) private Integer packages;
  @Convert(converter = EncryptedIntegerConverter.class) @Column(name = "pieces_per_package", nullable = false, length = 64) private Integer piecesPerPackage;
  @Convert(converter = EncryptedBigDecimalConverter.class) @Column(name = "unit_price_per_piece", nullable = false, length = 128) private BigDecimal unitPricePerPiece;
  @Convert(converter = EncryptedLocalDateConverter.class) @Column(name = "production_date", nullable = false, length = 64) private LocalDate productionDate;
  @Convert(converter = EncryptedLongConverter.class) @Column(name = "total_pieces", nullable = false, length = 64) private Long totalPieces;
  @Convert(converter = EncryptedBigDecimalConverter.class) @Column(name = "total_amount", nullable = false, length = 128) private BigDecimal totalAmount;

  public Long getId(){return id;} public Settlement getSettlement(){return settlement;} public void setSettlement(Settlement v){settlement=v;}
  public Cut getCut(){return cut;} public void setCut(Cut v){cut=v;} public String getCutNumber(){return cutNumber;} public void setCutNumber(String v){cutNumber=v;}
  public String getDescription(){return description;} public void setDescription(String v){description=v;}
  public Integer getPackages(){return packages;} public void setPackages(Integer v){packages=v;}
  public Integer getPiecesPerPackage(){return piecesPerPackage;} public void setPiecesPerPackage(Integer v){piecesPerPackage=v;}
  public BigDecimal getUnitPricePerPiece(){return unitPricePerPiece;} public void setUnitPricePerPiece(BigDecimal v){unitPricePerPiece=v;}
  public LocalDate getProductionDate(){return productionDate;} public void setProductionDate(LocalDate v){productionDate=v;}
  public Long getTotalPieces(){return totalPieces;} public void setTotalPieces(Long v){totalPieces=v;}
  public BigDecimal getTotalAmount(){return totalAmount;} public void setTotalAmount(BigDecimal v){totalAmount=v;}
}
