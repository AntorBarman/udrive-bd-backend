const authService = require('../services/authService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  
  res.status(201).json(
    ApiResponse.created('Registration successful', user)
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const result = await authService.login(
    email,
    password,
    req.ip,
    req.headers['user-agent']
  );
  
  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
  
  res.status(200).json(
    ApiResponse.ok('Login successful', {
      user: result.user,
      accessToken: result.accessToken,
    })
  );
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  
  const result = await authService.refreshToken(
    refreshToken,
    req.ip,
    req.headers['user-agent']
  );
  
  // Set new refresh token in cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
  
  res.status(200).json(
    ApiResponse.ok('Token refreshed', {
      accessToken: result.accessToken,
    })
  );
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  
  await authService.logout(refreshToken);
  
  // Clear cookie
  res.clearCookie('refreshToken', {
    path: '/api/auth',
  });
  
  res.status(200).json(
    ApiResponse.ok('Logout successful')
  );
});

module.exports = {
  register,
  login,
  refresh,
  logout,
};