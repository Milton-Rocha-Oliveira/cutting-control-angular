package com.controldecortes.domain;
import jakarta.persistence.*; import java.time.OffsetDateTime; import java.util.*;
import com.controldecortes.security.EncryptedStringConverter;
@Entity @Table(name="suppliers")
public class Supplier {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Convert(converter=EncryptedStringConverter.class) @Column(nullable=false,length=512) private String name;
 @Convert(converter=EncryptedStringConverter.class) @Column(length=512) private String document;
 @Convert(converter=EncryptedStringConverter.class) @Column(length=512) private String email;
 @Convert(converter=EncryptedStringConverter.class) @Column(length=512) private String phone;
 @Column(name="document_fingerprint",length=64) private String documentFingerprint;
 @Column(name="owner_id",length=320,updatable=false) private String ownerId;
 @Column(nullable=false) private boolean active=true;
 @Column(name="created_at",nullable=false) private OffsetDateTime createdAt=OffsetDateTime.now();
 @Column(name="updated_at",nullable=false) private OffsetDateTime updatedAt=OffsetDateTime.now();
 @PreUpdate void touch(){updatedAt=OffsetDateTime.now();}
 public Supplier(){} public Supplier(String name,String document,String email,String phone){this.name=name;this.document=document;this.email=email;this.phone=phone;}
 public String getDocumentFingerprint(){return documentFingerprint;} public void setDocumentFingerprint(String v){documentFingerprint=v;}
 public String getOwnerId(){return ownerId;} public void setOwnerId(String v){ownerId=v;}
 public Long getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;} public String getDocument(){return document;} public void setDocument(String v){document=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getPhone(){return phone;} public void setPhone(String v){phone=v;} public boolean isActive(){return active;} public void setActive(boolean v){active=v;} public OffsetDateTime getCreatedAt(){return createdAt;}
}
