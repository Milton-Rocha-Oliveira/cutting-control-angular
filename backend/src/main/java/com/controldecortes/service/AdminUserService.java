package com.controldecortes.service;

import com.controldecortes.domain.AppUser;
import com.controldecortes.dto.ApiDtos.AdminStatus;
import com.controldecortes.dto.ApiDtos.CreateUserRequest;
import com.controldecortes.dto.ApiDtos.CreateUserResponse;
import com.controldecortes.dto.ApiDtos.ResetUserPasswordRequest;
import com.controldecortes.exception.ApiException;
import com.controldecortes.repository.AppUserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AdminUserService {
  private static final Logger AUDIT = LoggerFactory.getLogger("AUTH_AUDIT");
  private final AppUserRepository users;
  private final PasswordEncoder passwordEncoder;

  public AdminUserService(AppUserRepository users, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
  }

  public AdminStatus status(Authentication authentication) {
    boolean root = isRoot(authentication);
    return new AdminStatus(root, root, authentication != null && authentication.isAuthenticated());
  }

  @Transactional
  public CreateUserResponse create(Authentication authentication, CreateUserRequest request) {
    requireRoot(authentication);
    String email = request.email().trim().toLowerCase();
    if (users.existsByEmailIgnoreCase(email)) throw new ApiException(HttpStatus.CONFLICT, "Este e-mail já possui uma conta");
    String id = request.id() == null ? UUID.randomUUID().toString() : UUID.fromString(request.id()).toString();
    AppUser user = users.save(new AppUser(id, email, request.name().trim(), passwordEncoder.encode(request.password()), false));
    AUDIT.info("event=user_created actorId={} userId={}", authentication.getName(), user.getId());
    return new CreateUserResponse(user.getId(), user.getEmail(), "conta_criada");
  }

  @Transactional
  public void resetPassword(Authentication authentication, ResetUserPasswordRequest request) {
    requireRoot(authentication);
    AppUser user = users.findByEmailIgnoreCase(request.email().trim().toLowerCase())
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conta não encontrada"));
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    users.save(user);
    AUDIT.info("event=admin_password_reset actorId={} userId={}", authentication.getName(), user.getId());
  }

  public boolean isRoot(Authentication authentication) {
    return authentication instanceof JwtAuthenticationToken jwt && jwt.isAuthenticated()
      && jwt.getToken().getClaimAsStringList("roles") != null
      && jwt.getToken().getClaimAsStringList("roles").contains("ROLE_ROOT");
  }

  private void requireRoot(Authentication authentication) {
    if (!isRoot(authentication)) throw new ApiException(HttpStatus.FORBIDDEN, "Somente o usuário root pode criar contas");
  }
}
