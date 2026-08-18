const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');
const tokenRepository = require('../repositories/tokenRepository');
const { generateAccessToken, generateRefreshToken, generateTokenHash } = require('../utils/tokenGenerator');
const ApiError = require('../utils/ApiError');

class AuthService {
  async register(userData) {
    // Check duplicate email
    const existingEmail = await userRepository.findByEmail(userData.email);
    if (existingEmail) {
      throw ApiError.conflict('Email already registered');
    }
    
    // Check duplicate phone
    const existingPhone = await userRepository.findByPhone(userData.phone);
    if (existingPhone) {
      throw ApiError.conflict('Phone number already registered');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    // Create user
    const user = await userRepository.create({
      ...userData,
      passwordHash,
    });
    
    return user;
  }
  
  async login(email, password, ipAddress, userAgent) {
    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    
    // Check if user is active
    if (!user.is_active) {
      throw ApiError.forbidden('Account is deactivated');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const tokenHash = generateTokenHash(refreshToken);
    
    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await tokenRepository.create(user.id, tokenHash, expiresAt, ipAddress, userAgent);
    
    // Update last login
    await userRepository.updateLastLogin(user.id);
    
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }
  
  async refreshToken(refreshToken, ipAddress, userAgent) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token not provided');
    }
    
    // Hash the token
    const tokenHash = generateTokenHash(refreshToken);
    
    // Find token in database
    const storedToken = await tokenRepository.findByTokenHash(tokenHash);
    
    if (!storedToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    
    // Check if revoked
    if (storedToken.is_revoked) {
      // Token reuse detected - revoke all user tokens
      await tokenRepository.revokeAllForUser(storedToken.user_id);
      throw ApiError.unauthorized('Refresh token has been revoked');
    }
    
    // Check if expired
    if (new Date(storedToken.expires_at) < new Date()) {
      throw ApiError.unauthorized('Refresh token expired');
    }
    
    // Get user
    const user = await userRepository.findById(storedToken.user_id);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized('User not found or inactive');
    }
    
    // Revoke old token (ROTATION)
    await tokenRepository.revoke(storedToken.id);
    
    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = generateTokenHash(newRefreshToken);
    
    // Save new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await tokenRepository.create(user.id, newTokenHash, expiresAt, ipAddress, userAgent);
    
    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
  
  async logout(refreshToken) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token not provided');
    }
    
    const tokenHash = generateTokenHash(refreshToken);
    const storedToken = await tokenRepository.findByTokenHash(tokenHash);
    
    if (storedToken) {
      await tokenRepository.revoke(storedToken.id);
    }
    
    return true;
  }
}

module.exports = new AuthService();