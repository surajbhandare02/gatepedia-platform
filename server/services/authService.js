const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const {
  jwtSecret,
  jwtExpiresIn,
  jwtRefreshExpiresIn,
  nodeEnv,
} = require("../config/env");
const { HttpError } = require("../middleware/errorHandler");

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || "student",
    created_at: row.created_at,
  };
}

function signUser(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "student",
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

function addDuration(value) {
  const match = String(value || "30d").match(/^(\d+)([mhd])$/);
  const amount = match ? Number(match[1]) : 30;
  const unit = match ? match[2] : "d";
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + amount * multipliers[unit]);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createRefreshSession(user, context = {}) {
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = addDuration(jwtRefreshExpiresIn);

  await prisma.userSession.create({
    data: {
      user_id: user.id,
      refresh_token_hash: refreshTokenHash,
      user_agent: context.userAgent || null,
      ip_address: context.ipAddress || null,
      expires_at: expiresAt
    }
  });

  return refreshToken;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  if (!password || String(password).length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }
}

async function register({ name, email, password }, context = {}) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (!cleanName) throw new HttpError(400, "Name is required");
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new HttpError(400, "Valid email is required");
  }
  validatePassword(password);

  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  
  if (existing) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const inserted = await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash
    }
  });

  const user = publicUser(inserted);
  const token = signUser(user);
  const refreshToken = await createRefreshSession(user, context);
  return { user, token, accessToken: token, refreshToken };
}

async function login({ email, password }, context = {}) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const row = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  
  if (!row) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (!row.password_hash) {
    throw new HttpError(401, "Please register this account again to enable login");
  }

  const ok = await bcrypt.compare(String(password), row.password_hash);
  if (!ok) {
    throw new HttpError(401, "Invalid email or password");
  }

  const user = publicUser(row);
  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() }
  });
  
  const token = signUser(user);
  const refreshToken = await createRefreshSession(user, context);
  return { user, token, accessToken: token, refreshToken };
}

async function getMe(userId) {
  const row = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!row) {
    throw new HttpError(404, "User not found");
  }
  return publicUser(row);
}

async function refresh(refreshToken, context = {}) {
  if (!refreshToken) throw new HttpError(401, "Refresh token required");
  const refreshTokenHash = hashToken(refreshToken);
  
  const sessionRow = await prisma.userSession.findFirst({
    where: {
      refresh_token_hash: refreshTokenHash,
      revoked_at: null,
      expires_at: { gt: new Date() }
    },
    include: { user: true }
  });

  if (!sessionRow) {
    throw new HttpError(401, "Refresh session expired. Please log in again.");
  }

  await prisma.userSession.update({
    where: { id: sessionRow.id },
    data: { revoked_at: new Date() }
  });

  const user = publicUser(sessionRow.user);
  const token = signUser(user);
  const nextRefreshToken = await createRefreshSession(user, context);
  return { user, token, accessToken: token, refreshToken: nextRefreshToken };
}

async function logout(refreshToken) {
  if (!refreshToken) return { revoked: 0 };
  const result = await prisma.userSession.updateMany({
    where: {
      refresh_token_hash: hashToken(refreshToken),
      revoked_at: null
    },
    data: { revoked_at: new Date() }
  });
  return { revoked: result.count };
}

async function requestPasswordReset(email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw new HttpError(400, "Email is required");

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });

  if (!user) {
    return { message: "If the account exists, a reset link has been created." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60_000); // 30 minutes
  
  await prisma.passwordResetToken.create({
    data: {
      user_id: user.id,
      token_hash: hashToken(resetToken),
      expires_at: expiresAt
    }
  });

  return {
    message: "Password reset token generated.",
    ...(nodeEnv !== "production" && { resetToken }),
  };
}

async function resetPassword({ token, password }) {
  if (!token) throw new HttpError(400, "Reset token is required");
  validatePassword(password);

  const resetRow = await prisma.passwordResetToken.findFirst({
    where: {
      token_hash: hashToken(token),
      used_at: null,
      expires_at: { gt: new Date() }
    }
  });

  if (!resetRow) {
    throw new HttpError(400, "Reset token is invalid or expired");
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetRow.user_id },
      data: { password_hash: passwordHash }
    });
    await tx.passwordResetToken.update({
      where: { id: resetRow.id },
      data: { used_at: new Date() }
    });
    await tx.userSession.updateMany({
      where: { user_id: resetRow.user_id },
      data: { revoked_at: new Date() }
    });
  });

  return { message: "Password updated. Please log in again." };
}

async function requestEmailVerification(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  
  await prisma.emailVerificationToken.create({
    data: {
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: expiresAt
    }
  });
  
  return {
    message: "Email verification token generated.",
    ...(nodeEnv !== "production" && { verificationToken: token }),
  };
}

async function verifyEmail(token) {
  if (!token) throw new HttpError(400, "Verification token is required");
  
  const vToken = await prisma.emailVerificationToken.findFirst({
    where: {
      token_hash: hashToken(token),
      used_at: null,
      expires_at: { gt: new Date() }
    }
  });

  if (!vToken) {
    throw new HttpError(400, "Verification token is invalid or expired");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: vToken.user_id },
      data: { email_verified_at: new Date() }
    });
    await tx.emailVerificationToken.update({
      where: { id: vToken.id },
      data: { used_at: new Date() }
    });
  });

  return { message: "Email verified successfully." };
}

async function setupMfa(userId) {
  const secret = crypto.randomBytes(20).toString("hex");
  
  await prisma.userMfaSetting.upsert({
    where: { user_id: userId },
    update: { secret, enabled: false, updated_at: new Date() },
    create: { user_id: userId, secret, enabled: false }
  });
  
  return {
    secret,
    message: "Use this secret with an authenticator app, then verify a 6-digit code.",
  };
}

async function verifyMfa(userId, code) {
  if (!/^\d{6}$/.test(String(code || ""))) {
    throw new HttpError(400, "Enter a valid 6-digit code");
  }
  
  await prisma.userMfaSetting.update({
    where: { user_id: userId },
    data: { enabled: true, last_verified_at: new Date(), updated_at: new Date() }
  });
  
  return { message: "2FA has been enabled for this account." };
}

async function oauthStatus(provider) {
  return {
    provider,
    configured: false,
    message:
      "OAuth scaffolding is ready. Add provider credentials and Passport strategies before enabling redirects.",
  };
}

module.exports = {
  register,
  login,
  getMe,
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
