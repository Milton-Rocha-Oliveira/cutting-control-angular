package com.controldecortes.service;

import com.controldecortes.domain.AppUser;
import com.controldecortes.dto.ApiDtos.AuthUserResponse;
import com.controldecortes.dto.ApiDtos.LoginRequest;
import com.controldecortes.dto.ApiDtos.LoginResponse;
import com.controldecortes.dto.ApiDtos.RegisterRequest;
import com.controldecortes.exception.ApiException;
import com.controldecortes.repository.AppUserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import com.controldecortes.dto.ApiDtos.ChangePasswordRequest;
import org.springframework.http.HttpStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class LocalAuthService {
  private static final Logger AUDIT = LoggerFactory.getLogger("AUTH_AUDIT");
  private static final long TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;
  private final AppUserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtEncoder jwtEncoder;
  @Value("${app.auth.public-registration:true}") private boolean publicRegistration;

  public LocalAuthService(AppUserRepository users, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtEncoder = jwtEncoder;
  }

  public LoginResponse login(LoginRequest request) {
    String email = request.email().trim().toLowerCase();
    AppUser user = users.findByEmailIgnoreCase(email).filter(AppUser::isEnabled).orElse(null);
    if (user == null) {
      AUDIT.warn("event=login_failed reason=unknown_or_disabled_account");
      throw new ApiException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos");
    }
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      AUDIT.warn("event=login_failed reason=invalid_password userId={}", user.getId());
      throw new ApiException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos");
    }
    AUDIT.info("event=login_succeeded userId={}", user.getId());
    return issueToken(user);
  }

  public LoginResponse register(RegisterRequest request) {
    if (!publicRegistration) {
      AUDIT.warn("event=registration_rejected reason=public_registration_disabled");
      throw new ApiException(HttpStatus.FORBIDDEN, "Cadastro público desativado. Solicite uma conta ao administrador.");
    }
    String email = request.email().trim().toLowerCase();
    if (users.existsByEmailIgnoreCase(email)) {
      throw new ApiException(HttpStatus.CONFLICT, "Este e-mail já possui uma conta");
    }
    AppUser user = users.save(new AppUser(UUID.randomUUID().toString(), email,
      request.name().trim(), passwordEncoder.encode(request.password()), false));
    AUDIT.info("event=registration_succeeded userId={}", user.getId());
    return issueToken(user);
  }

  private LoginResponse issueToken(AppUser user) {
    Instant now = Instant.now();
    String role = user.isRoot() ? "ROOT" : "USER";
    JwtClaimsSet claims = JwtClaimsSet.builder()
      .issuer("controle-de-cortes-api")
      .issuedAt(now)
      .expiresAt(now.plusSeconds(TOKEN_LIFETIME_SECONDS))
      .subject(user.getId())
      .claim("email", user.getEmail())
      .claim("name", user.getName())
      .claim("roles", List.of("ROLE_" + role))
      .build();
    String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    return new LoginResponse(token, "Bearer", TOKEN_LIFETIME_SECONDS,
      new AuthUserResponse(user.getId(), user.getEmail(), user.getName(), user.isRoot()));
  }

  public void changePassword(Authentication authentication, ChangePasswordRequest request) {
    AppUser user = users.findById(authentication.getName())
      .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Sessão inválida"));
    if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "A senha atual está incorreta");
    }
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    users.save(user);
    AUDIT.info("event=password_changed userId={}", user.getId());
  }
}
