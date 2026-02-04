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
  const tokenPayload = {
    id: user.id,
    username: user.username,
    userid: user.userid,
    email: user.email,
    designation: user.designation,
    department: user.department,
    role: user.role,
    reporting_manager_id: user.reporting_manager_id,
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
    expiresIn: '30d',
  });

  return {
    token,
    user: tokenPayload as AuthUser,
  };
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
