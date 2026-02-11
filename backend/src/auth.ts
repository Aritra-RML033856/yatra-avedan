import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

const ACCESS_TOKEN_EXPIRY = '9h';
const REFRESH_TOKEN_EXPIRY_DAYS = 10;

export const generateAccessToken = (user: AuthUser) => {
  return jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = async (user: AuthUser) => {
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await pool.query(
    'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [refreshToken, user.id, expiresAt]
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
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { id: number };

    // Check if token exists in DB and is not expired
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.id]
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

    const newAccessToken = generateAccessToken(tokenPayload);

    return {
      accessToken: newAccessToken,
      user: tokenPayload,
    };

  } catch (err) {
    throw new Error('Invalid refresh token');
  }
};

export const authenticate = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    // ✅ decoded now matches AuthUser structure
    return decoded as AuthUser;
  } catch (err) {
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
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  return { success: true };
};
