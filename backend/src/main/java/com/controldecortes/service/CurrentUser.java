package com.controldecortes.service;
import com.controldecortes.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
final class CurrentUser { private CurrentUser(){} static String id(){var a=SecurityContextHolder.getContext().getAuthentication();if(a==null||!a.isAuthenticated()||"anonymousUser".equals(a.getName()))throw new ApiException(HttpStatus.UNAUTHORIZED,"Autenticação obrigatória");String id=a.getName().trim();if(id.isBlank())throw new ApiException(HttpStatus.UNAUTHORIZED,"Identidade do usuário ausente");return id;} }
