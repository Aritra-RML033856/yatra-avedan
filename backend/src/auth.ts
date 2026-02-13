import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from './database.js';

export interface AuthUser {
  id: number;
  username: string;
  userid: string;
  email: string;
  designation: string;
  department: string;
  role: string;
  reporting_manager_id?: string;
}

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '9h';
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '10', 10);

export const generateAccessToken = (user: AuthUser) => {
  return jwt.sign({ ...user, type: 'access' }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY as any });
};

const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateRefreshToken = async (user: AuthUser) => {
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET!, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` as any });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const hashedToken = hashToken(refreshToken);

  await pool.query(
    'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashedToken, user.id, expiresAt]
  );

  return refreshToken;
};

export const login = async (userid: string, password: string) => {
  const result = await pool.query('SELECT * FROM users WHERE userid = $1', [userid]);
  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];
  const validPassword = await bcrypt.compare(password, user.encrypted_password);
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  // ✅ include reporting_manager_id, username, email, designation in token
  const tokenPayload: AuthUser = {
    id: user.id,
    username: user.username,
    userid: user.userid,
    email: user.email,
    designation: user.designation,
    department: user.department,
    role: user.role,
    reporting_manager_id: user.reporting_manager_id,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = await generateRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
    user: tokenPayload,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new Error('Refresh token required');
  }

  try {
    // Verify token signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { id: number, type: string };

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if hashed token exists in DB and is not expired
    const hashedToken = hashToken(refreshToken);
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [hashedToken, decoded.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user details
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];
    const tokenPayload: AuthUser = {
      id: user.id,
      username: user.username,
      userid: user.userid,
      email: user.email,
      designation: user.designation,
      department: user.department,
      role: user.role,
      reporting_manager_id: user.reporting_manager_id,
    };

    // Token Rotation:
    // 1. Delete the old token (we already validated it exists)
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [hashedToken]);

    // 2. Generate a new refresh token
    const newRefreshToken = await generateRefreshToken(tokenPayload);
    const newAccessToken = generateAccessToken(tokenPayload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: tokenPayload,
    };

  } catch (err) {
    throw new Error('Invalid refresh token');
  }
};

export const authenticate = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded.type !== 'access') {
      return null;
    }

    // ✅ decoded now matches AuthUser structure
    return decoded as AuthUser;
  } catch (err) {
    console.error('Authenticate Error:', err);
    return null;
  }
};

export const changePassword = async (user: AuthUser, currentPassword: string, newPassword: string) => {
  // Get user data from database
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const dbUser = result.rows[0];

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, dbUser.encrypted_password);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update password in database
  await pool.query('UPDATE users SET encrypted_password = $1 WHERE id = $2', [hashedNewPassword, user.id]);

  return { success: true, message: 'Password changed successfully' };
};

export const logout = async (refreshToken: string) => {
  const hashedToken = hashToken(refreshToken);
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [hashedToken]);
  return { success: true };
};

export const revokeUserRefreshTokens = async (userId: number) => {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  return { success: true };
};
