const authService = require("../services/authService");
const {
  nodeEnv,
  refreshCookieName,
  jwtRefreshExpiresIn,
} = require("../config/env");

function requestContext(req) {
  return {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };
}

function cookieMaxAge(value) {
  const match = String(value || "30d").match(/^(\d+)([mhd])$/);
  const amount = match ? Number(match[1]) : 30;
  const unit = match ? match[2] : "d";
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax",
    maxAge: cookieMaxAge(jwtRefreshExpiresIn),
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax",
  });
}

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body, requestContext(req));
    setRefreshCookie(res, data.refreshToken);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body, requestContext(req));
    setRefreshCookie(res, data.refreshToken);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.[refreshCookieName];
    const data = await authService.refresh(refreshToken, requestContext(req));
    setRefreshCookie(res, data.refreshToken);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.[refreshCookieName];
    const data = await authService.logout(refreshToken);
    clearRefreshCookie(res);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    const data = await authService.requestPasswordReset(req.body.email);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function resetPassword(req, res, next) {
  try {
    const data = await authService.resetPassword(req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function requestEmailVerification(req, res, next) {
  try {
    const data = await authService.requestEmailVerification(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const data = await authService.verifyEmail(req.body.token);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function setupMfa(req, res, next) {
  try {
    const data = await authService.setupMfa(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function verifyMfa(req, res, next) {
  try {
    const data = await authService.verifyMfa(req.user.id, req.body.code);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function oauthStatus(req, res, next) {
  try {
    const data = await authService.oauthStatus(req.params.provider);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  register,
  login,
  me,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  requestEmailVerification,
  verifyEmail,
  setupMfa,
  verifyMfa,
  oauthStatus,
};
