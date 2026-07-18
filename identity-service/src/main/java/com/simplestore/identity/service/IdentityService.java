package com.simplestore.identity.service;

import com.simplestore.common.dto.PagedResult;
import com.simplestore.identity.dto.LoginRequest;
import com.simplestore.identity.dto.RegisterRequest;
import com.simplestore.identity.dto.TokenResponse;
import com.simplestore.identity.dto.UserDto;
import com.simplestore.identity.model.ApplicationUser;
import com.simplestore.identity.model.RefreshToken;
import com.simplestore.identity.repository.RefreshTokenRepository;
import com.simplestore.identity.repository.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class IdentityService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public IdentityService(UserRepository userRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           @Lazy PasswordEncoder passwordEncoder,
                           @Lazy AuthenticationManager authenticationManager,
                           JwtService jwtService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    public UserDetails loadUserByUserId(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));
    }

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        Instant now = Instant.now();
        ApplicationUser user = ApplicationUser.builder()
                .id(UUID.randomUUID().toString())
                .email(request.getEmail().toLowerCase())
                .fullName(request.getFullName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .createdAt(now)
                .updatedAt(now)
                .locked(false)
                .build();

        userRepository.save(user);
        return generateTokens(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        ApplicationUser user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return generateTokens(user);
    }

    @Transactional
    public TokenResponse refresh(String refreshTokenValue) {
        if (!jwtService.validateToken(refreshTokenValue)) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        String userId = jwtService.getUserId(refreshTokenValue);
        String tokenHash = hashToken(refreshTokenValue);

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token not found"));

        if (storedToken.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(storedToken);
            throw new IllegalArgumentException("Refresh token expired");
        }

        refreshTokenRepository.delete(storedToken);

        ApplicationUser user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return generateTokens(user);
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        String tokenHash = hashToken(refreshTokenValue);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(refreshTokenRepository::delete);
    }

    public UserDto getUserInfo(String userId) {
        ApplicationUser user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return mapToDto(user);
    }

    public PagedResult<UserDto> getUsers(int page, int pageSize) {
        Page<ApplicationUser> userPage = userRepository.findAll(PageRequest.of(page, pageSize));
        return PagedResult.from(userPage.getContent(), userPage.getTotalElements(),
                userPage.getNumber(), userPage.getSize(), this::mapToDto);
    }

    @Transactional
    public UserDto updateUser(String userId, String fullName) {
        ApplicationUser user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        user.setFullName(fullName);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        return mapToDto(user);
    }

    @Transactional
    public void lockUser(String userId) {
        ApplicationUser user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        user.setLocked(true);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    @Transactional
    public void unlockUser(String userId) {
        ApplicationUser user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        user.setLocked(false);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    private TokenResponse generateTokens(ApplicationUser user) {
        List<String> roles = user.getAuthorities().stream()
                .map(Object::toString)
                .toList();

        String accessToken = jwtService.generateAccessToken(user.getId(), roles);
        String refreshTokenValue = jwtService.generateRefreshToken(user.getId());

        RefreshToken refreshToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .userId(user.getId())
                .tokenHash(hashToken(refreshTokenValue))
                .expiresAt(Instant.now().plusMillis(jwtService.getRefreshExpiration()))
                .createdAt(Instant.now())
                .build();

        refreshTokenRepository.deleteByUserId(user.getId());
        refreshTokenRepository.save(refreshToken);

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenValue)
                .expiresIn(jwtService.getExpiration())
                .build();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private UserDto mapToDto(ApplicationUser user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(user.getAuthorities().stream()
                        .map(Object::toString)
                        .toList())
                .locked(user.isLocked())
                .build();
    }
}
