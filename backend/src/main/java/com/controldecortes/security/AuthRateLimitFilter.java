package com.controldecortes.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Process-local throttle for unauthenticated login and registration requests. */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
  private static final Logger AUDIT = LoggerFactory.getLogger("AUTH_AUDIT");
  private record Window(long startsAt, AtomicInteger count) {}
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
  @Value("${app.auth.rate-limit.capacity:10}") private int capacity;
  @Value("${app.auth.rate-limit.window-seconds:60}") private int windowSeconds;

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !HttpMethod.POST.matches(request.getMethod())
      || !(path.equals("/api/auth/login") || path.equals("/api/auth/register"));
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    long now = Instant.now().getEpochSecond();
    String key = request.getRemoteAddr() + ':' + request.getRequestURI();
    Window window = windows.compute(key, (ignored, current) ->
      current == null || now - current.startsAt() >= windowSeconds
        ? new Window(now, new AtomicInteger()) : current);
    if (window.count().incrementAndGet() > capacity) {
      AUDIT.warn("event=auth_rate_limited route={}", request.getRequestURI());
      response.setStatus(429);
      response.setHeader("Retry-After", Integer.toString((int) Math.max(1, windowSeconds - (now - window.startsAt()))));
      response.setContentType("application/json");
      response.getWriter().write("{\"message\":\"Muitas tentativas. Aguarde antes de tentar novamente.\"}");
      return;
    }
    if (windows.size() > 10000) windows.entrySet().removeIf(e -> now - e.getValue().startsAt() >= windowSeconds);
    chain.doFilter(request, response);
  }
}
