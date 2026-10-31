package com.controldecortes.service;

import com.controldecortes.domain.AppUser;
import com.controldecortes.repository.AppUserRepository;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class RootUserBootstrap implements ApplicationRunner {
  private final AppUserRepository users;
  private final PasswordEncoder passwordEncoder;
  @Value("${app.bootstrap.email:}") private String email;
  @Value("${app.bootstrap.password:}") private String password;
  @Value("${app.bootstrap.name:Administrador}") private String name;
  @Value("${app.bootstrap.user-id:}") private String userId;

  public RootUserBootstrap(AppUserRepository users, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
  }

  @Override @Transactional
  public void run(ApplicationArguments args) {
    if (users.existsByRootTrue()) return;
    if (email.isBlank() || password.isBlank()) {
      if (email.isBlank() && password.isBlank()) return;
      throw new IllegalStateException("Configure APP_BOOTSTRAP_EMAIL e APP_BOOTSTRAP_PASSWORD juntos para criar uma conta root");
    }
    if (password.length() < 12 || password.length() > 128) {
      throw new IllegalStateException("APP_BOOTSTRAP_PASSWORD deve ter entre 12 e 128 caracteres");
    }
    if (users.existsByEmailIgnoreCase(email.trim())) throw new IllegalStateException("APP_BOOTSTRAP_EMAIL já pertence a uma conta que não é root");
    String id = userId.isBlank() ? UUID.randomUUID().toString() : UUID.fromString(userId.trim()).toString();
    users.save(new AppUser(id, email.trim().toLowerCase(), name.trim(), passwordEncoder.encode(password), true));
  }
}
