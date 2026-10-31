package com.controldecortes.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "app_users")
public class AppUser {
  @Id @Column(length = 36, nullable = false, updatable = false) private String id;
  @Column(nullable = false, unique = true, length = 320) private String email;
  @Column(nullable = false, length = 100) private String name;
  @Column(name = "password_hash", nullable = false, length = 100) private String passwordHash;
  @Column(name = "is_root", nullable = false) private boolean root;
  @Column(nullable = false) private boolean enabled;
  @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;

  protected AppUser() {}

  public AppUser(String id, String email, String name, String passwordHash, boolean root) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.passwordHash = passwordHash;
    this.root = root;
    this.enabled = true;
    this.createdAt = OffsetDateTime.now();
  }

  public String getId() { return id; }
  public String getEmail() { return email; }
  public String getName() { return name; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public boolean isRoot() { return root; }
  public boolean isEnabled() { return enabled; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
}
