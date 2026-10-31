package com.controldecortes.controller;

import com.controldecortes.dto.ApiDtos.AdminStatus;
import com.controldecortes.dto.ApiDtos.CreateUserRequest;
import com.controldecortes.dto.ApiDtos.CreateUserResponse;
import com.controldecortes.dto.ApiDtos.ResetUserPasswordRequest;
import com.controldecortes.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final AdminUserService users;
  public AdminController(AdminUserService users) { this.users = users; }

  @GetMapping("/status")
  public AdminStatus status(Authentication authentication) { return users.status(authentication); }

  @PostMapping("/users")
  @ResponseStatus(HttpStatus.CREATED)
  public CreateUserResponse create(Authentication authentication, @Valid @RequestBody CreateUserRequest request) {
    return users.create(authentication, request);
  }

  @PostMapping("/users/reset-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resetPassword(Authentication authentication, @Valid @RequestBody ResetUserPasswordRequest request) {
    users.resetPassword(authentication, request);
  }
}
