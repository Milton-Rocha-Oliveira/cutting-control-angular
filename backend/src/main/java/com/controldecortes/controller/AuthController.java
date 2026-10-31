package com.controldecortes.controller;

import com.controldecortes.dto.ApiDtos.LoginRequest;
import com.controldecortes.dto.ApiDtos.LoginResponse;
import com.controldecortes.dto.ApiDtos.ChangePasswordRequest;
import com.controldecortes.dto.ApiDtos.RegisterRequest;
import com.controldecortes.service.LocalAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final LocalAuthService auth;
  public AuthController(LocalAuthService auth) { this.auth = auth; }

  @PostMapping("/login")
  public LoginResponse login(@Valid @RequestBody LoginRequest request) { return auth.login(request); }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public LoginResponse register(@Valid @RequestBody RegisterRequest request) { return auth.register(request); }

  @PostMapping("/change-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
    auth.changePassword(authentication, request);
  }
}
