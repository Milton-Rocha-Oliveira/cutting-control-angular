package com.controldecortes.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.controldecortes.security.AuthRateLimitFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.springframework.security.config.Customizer;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Value("${app.jwt.secret}") private String jwtSecret;
  @Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost:4300}") private String allowedOrigins;

  @Bean SecurityFilterChain filterChain(HttpSecurity http, AuthRateLimitFilter authRateLimitFilter) throws Exception {
    http.csrf(c -> c.disable()).cors(c -> c.configurationSource(cors()))
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a -> a
        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
        .requestMatchers("/actuator/health").permitAll()
        .requestMatchers("/api/**").authenticated()
        .anyRequest().denyAll())
      .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
    http.addFilterBefore(authRateLimitFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean SecretKey jwtSigningKey() {
    byte[] bytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) throw new IllegalStateException("APP_JWT_SECRET precisa ter pelo menos 32 bytes");
    return new SecretKeySpec(bytes, "HmacSHA256");
  }

  @Bean FilterRegistrationBean<AuthRateLimitFilter> authRateLimitFilterRegistration(AuthRateLimitFilter filter) {
    FilterRegistrationBean<AuthRateLimitFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setEnabled(false); // The filter is added explicitly to Spring Security's chain.
    return registration;
  }

  @Bean JwtDecoder jwtDecoder(SecretKey jwtSigningKey) {
    return NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS256).build();
  }

  @Bean JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
  }

  @Bean PasswordEncoder passwordEncoder() { return Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8(); }

  @Bean CorsConfigurationSource cors() {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList());
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin"));
    c.setAllowCredentials(false);
    c.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", c);
    return source;
  }
}
