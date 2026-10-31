package com.controldecortes.domain;
import jakarta.persistence.*; import java.math.BigDecimal; import java.time.OffsetDateTime; import java.util.*;
import com.controldecortes.security.EncryptedBigDecimalConverter;
import com.controldecortes.security.EncryptedLongConverter;
@Entity @Table(name="settlements")
public class Settlement {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="invoice_number",nullable=false,unique=true) private String invoiceNumber;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="supplier_id") private Supplier supplier;
 @Column(name="settled_at",nullable=false) private OffsetDateTime settledAt=OffsetDateTime.now();
 @Convert(converter=EncryptedBigDecimalConverter.class) @Column(name="total_amount",nullable=false,length=128) private BigDecimal totalAmount=BigDecimal.ZERO;
 @Convert(converter=EncryptedLongConverter.class) @Column(name="total_pieces",nullable=false,length=64) private Long totalPieces=0L;
 @Column(name="created_by",nullable=false) private String createdBy;
 @OneToMany(mappedBy="settlement",cascade=CascadeType.ALL,orphanRemoval=true) private List<SettlementItem> items=new ArrayList<>();
 public Long getId(){return id;} public String getInvoiceNumber(){return invoiceNumber;} public void setInvoiceNumber(String v){invoiceNumber=v;} public Supplier getSupplier(){return supplier;} public void setSupplier(Supplier v){supplier=v;} public OffsetDateTime getSettledAt(){return settledAt;} public BigDecimal getTotalAmount(){return totalAmount;} public void setTotalAmount(BigDecimal v){totalAmount=v;} public Long getTotalPieces(){return totalPieces;} public void setTotalPieces(Long v){totalPieces=v;} public String getCreatedBy(){return createdBy;} public void setCreatedBy(String v){createdBy=v;} public List<SettlementItem> getItems(){return items;} public void addItem(SettlementItem i){items.add(i);i.setSettlement(this);}
}
