import dotenv from 'dotenv';
dotenv.config();
// console.log('ENV FILE LOADED, EMAIL_SMTP_HOST =', process.env.EMAIL_SMTP_HOST);

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { utils } from 'xlsx';
import pool from './database.js';
import { createTables, seedData } from './database.js';
import { login, authenticate, changePassword } from './auth.js';
import { createTrip, autoCloseTrips } from './trips.js';
import { prepareFileAttachments, sendTripNotificationEmail } from './email.js';
import locationsRouter from './routes/locations.js';
import { USER_ROLES, TRIP_STATUS, FILE_TYPES, UPLOAD_PATHS, EMAIL_SUBJECTS } from './constants.js';

// Auto-close trips scheduler (runs every hour)
setInterval(() => {
  console.log('Running auto-close trips job...');
  autoCloseTrips();
}, 60 * 60 * 1000);

// Run once on startup
setTimeout(() => {
  autoCloseTrips();
}, 5000);

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), UPLOAD_PATHS.BASE);
const travelOptionsDir = path.join(process.cwd(), UPLOAD_PATHS.TRAVEL_OPTIONS);
const receiptsDir = path.join(process.cwd(), UPLOAD_PATHS.RECEIPTS);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(travelOptionsDir)) {
  fs.mkdirSync(travelOptionsDir);
}

if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir);
}

console.log('Upload directories ensured.');

const app = express();
// const PORT = process.env.PORT || 5000;
const PORT: number = parseInt(process.env.PORT ?? '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Initialize database
(async () => {
  try {
    console.log('Checking database schema...');
    await createTables();
    await seedData(); // Idempotent (ON CONFLICT DO NOTHING)
    const { seedLocations } = await import('./seed_locations.js');
    await seedLocations();
    console.log('Database tables created and seeded.');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
})();

// Auth Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const decoded = authenticate(token);
  if (!decoded) {
    console.error('Auth Middleware: Invalid token or verification failed');
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.user = decoded;
  next();
};

// File upload middleware
const travelOptionsUpload = multer({ dest: UPLOAD_PATHS.TRAVEL_OPTIONS });
const receiptsUpload = multer({ dest: UPLOAD_PATHS.RECEIPTS });

// Static files
app.use('/uploads', express.static('uploads'));

app.get('/api/download', (req: any, res: any) => {
  const filepath = req.query.filepath as string;
  const filename = req.query.filename as string;

  if (!filepath || !filename) {
    return res.status(400).json({ error: 'Missing filepath or filename parameters' });
  }

  const fullPath = path.join(process.cwd(), filepath);

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Set proper headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Stream the file
  const fileStream = fs.createReadStream(fullPath);
  fileStream.pipe(res);

  fileStream.on('error', (error) => {
    console.error('File stream error:', error);
    res.status(500).json({ error: 'Error downloading file' });
  });
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Trip Request Flow API' });
});

app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { userid, password } = req.body;
    if (!userid || !password) {
      return res.status(400).json({ error: 'Userid and password required' });
    }
    const result = await login(userid, password);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false in dev
      sameSite: 'lax',
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
      path: '/'
    });

    // Return only access token and user info
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/refresh', async (req: any, res: any) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' }); // 401 triggers logout on frontend
    }
    const { refreshAccessToken } = await import('./auth.js');
    const result = await refreshAccessToken(refreshToken);

    // Rotate refresh token: set new cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
      path: '/'
    });

    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err: any) {
    // Clear cookie if refresh fails
    res.clearCookie('refreshToken');
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req: any, res: any) => {
  try {
    // Aggressively clear cookies with different options to catch all variations
    const clearOptions = [
      { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' },
      { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }, // Add lax option
      { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth' },
      { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' } // default path
    ];

    clearOptions.forEach(option => res.clearCookie('refreshToken', option));

    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers.authorization;

    console.log('LOGOUT REQUEST:', {
      hasCookie: !!refreshToken,
      hasAuthHeader: !!authHeader,
      cookies: req.cookies
    });

    if (refreshToken) {
      console.log('Revoking token via Cookie');
      const { logout } = await import('./auth.js');
      await logout(refreshToken);
    } else if (authHeader) {
      // Fallback: If cookie is missing (path issue?), use Access Token to identify user and revoke ALL sessions
      // This is a "Nuclear" logout to fix the stuck session issue
      console.log('Cookie missing. Attempting revocation via Access Token...');
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const { authenticate, revokeUserRefreshTokens } = await import('./auth.js');

      const decoded = authenticate(token);
      if (decoded) {
        console.log(`Revoking all tokens for user ${decoded.id} (Nuclear Option)`);
        await revokeUserRefreshTokens(decoded.id);
      } else {
        console.log('Access token invalid, cannot identify user to revoke.');
      }
    } else {
      console.log('No credentials provided for logout. Just cleared cookies.');
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Logout error:', err);
    // Even on error, try to clear
    res.clearCookie('refreshToken', { path: '/' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', authMiddleware, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    const result = await changePassword(req.user, currentPassword, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/trips/create', authMiddleware, async (req: any, res: any) => {
  try {
    const result = await createTrip(req.user, req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/approvals/stats', authMiddleware, async (req: any, res: any) => {
  try {
    const { getApprovalCounts } = await import('./approvals.js');
    const stats = await getApprovalCounts(req.user.id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/approvals', authMiddleware, async (req: any, res: any) => {
  try {
    const { getApprovals } = await import('./approvals.js');
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const filter = req.query.filter as 'pending' | 'approved' | 'rejected' | undefined;

    const approvals = await getApprovals(req.user.id, limit, offset, filter);
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/approvals/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { approveTrip } = await import('./approvals.js');
    const result = await approveTrip(parseInt(req.params.id), req.user, req.body.action, req.body.comments);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trips/approved', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN) return res.status(403).json({ error: 'Unauthorized' });
  const { getApprovedTrips } = await import('./trips.js');

  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as string | undefined;

  res.json(await getApprovedTrips(limit, offset, status));
});

app.get('/api/trips/cancelled', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN && req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403).json({ error: 'Unauthorized' });
  const { getCancelledTripsForAdmin } = await import('./trips.js');
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  res.json(await getCancelledTripsForAdmin(limit, offset));
});

app.post('/api/trips/:id/options', authMiddleware, travelOptionsUpload.array('files', 10), async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN) return res.status(403).json({ error: 'Unauthorized' });

  const tripId = parseInt(req.params.id);
  const fileRecords: any[] = [];

  // Insert files into database and collect file records
  for (const file of req.files as any) {
    await pool.query('INSERT INTO file_uploads (trip_id, uploaded_by, file_type, filepath, filename) VALUES ($1,$2,$3,$4,$5)',
      [tripId, req.user.id, FILE_TYPES.TRAVEL_OPTIONS, file.path, file.originalname]);
    fileRecords.push({
      filepath: file.path,
      filename: file.originalname
    });
  }

  // Update trip status
  const { updateTripOptionStatus } = await import('./trips.js');
  await updateTripOptionStatus(tripId, TRIP_STATUS.SELECT_OPTION);

  // Send email with attachments to employee
  setImmediate(async () => {
    try {
      const tripData = await pool.query(`
        SELECT t.*, u.email as requester_email
        FROM trips t
        JOIN users u ON t.requester_id = u.userid
        WHERE t.id = $1
      `, [tripId]);

      if (tripData.rows.length > 0) {
        const trip = tripData.rows[0];
        const attachments = await prepareFileAttachments(fileRecords);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Get Travel Admin email for CC
        const travelAdmin = await pool.query('SELECT email FROM users WHERE role = $1 LIMIT 1', [USER_ROLES.TRAVEL_ADMIN]);
        const ccEmail = travelAdmin.rows.length > 0 ? travelAdmin.rows[0].email : undefined;

        await sendTripNotificationEmail(
          trip.requester_email,
          `Trip #${trip.reference_no} - ${EMAIL_SUBJECTS.OPTIONS_AVAILABLE}`,
          trip,
          'Travel options uploaded by Travel Admin. Please select your preferred option.',
          attachments,
          ccEmail,
          `${frontendUrl}/my-trips`
        );
      }
    } catch (error) {
      console.error('Email sending error for options upload:', error);
    }
  });

  res.json({ success: true, filesUploaded: req.files.length });
});

app.post('/api/trips/:id/select', authMiddleware, async (req: any, res: any) => {
  const { option, cost, mmt_payload } = req.body;
  const { updateTripOption } = await import('./trips.js');
  await updateTripOption(parseInt(req.params.id), option, req.user, cost, mmt_payload);
  res.json({ success: true });
});

app.post('/api/trips/:id/receipts', authMiddleware, receiptsUpload.array('files', 10), async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN) return res.status(403).json({ error: 'Unauthorized' });

  const tripId = parseInt(req.params.id);
  const { totalCost } = req.body;

  // Validate cost is an integer
  const costNum = parseInt(totalCost, 10);
  if (isNaN(costNum) || costNum <= 0 || !Number.isInteger(costNum)) {
    return res.status(400).json({ error: 'Invalid cost provided - must be a positive integer' });
  }

  const fileRecords: any[] = [];

  // Insert files into database and collect file records
  if (req.files && (req.files as any).length > 0) {
    for (const file of req.files as any) {
      await pool.query('INSERT INTO file_uploads (trip_id, uploaded_by, file_type, filepath, filename) VALUES ($1,$2,$3,$4,$5)',
        [tripId, req.user.id, FILE_TYPES.RECEIPTS, file.path, file.originalname]);
      fileRecords.push({
        filepath: file.path,
        filename: file.originalname
      });
    }
  }

  // Update trip status and cost
  const { updateTripOptionStatus } = await import('./trips.js');
  await pool.query('UPDATE trips SET status = $1, total_cost = $2, booked_at = $3 WHERE id = $4',
    [TRIP_STATUS.BOOKED, costNum, new Date(), tripId]);

  // Send email with receipt attachments to employee
  setImmediate(async () => {
    try {
      const tripData = await pool.query(`
        SELECT t.*, u.email as requester_email
        FROM trips t
        JOIN users u ON t.requester_id = u.userid
        WHERE t.id = $1
      `, [tripId]);

      if (tripData.rows.length > 0) {
        const trip = tripData.rows[0];
        const attachments = await prepareFileAttachments(fileRecords);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        await sendTripNotificationEmail(
          trip.requester_email,
          `Trip #${trip.reference_no} - ${EMAIL_SUBJECTS.BOOKING_CONFIRMED}`,
          trip,
          `Trip booked successfully - Total Cost: ₹${costNum.toLocaleString('en-IN')}${attachments.length > 0 ? ', receipts uploaded by Travel Admin' : ''}`,
          attachments,
          undefined,
          `${frontendUrl}/my-trips`
        );
      }
    } catch (error) {
      console.error('Email sending error for receipts upload:', error);
    }
  });

  res.json({ success: true, filesUploaded: (req.files as any)?.length || 0, totalCost: costNum });
});

app.get('/api/trips/my', authMiddleware, async (req: any, res: any) => {
  const { getMyTrips } = await import('./trips.js');
  res.json(await getMyTrips(req.user.userid));
});

// Visa Upload Middleware
const visaUpload = multer({ dest: UPLOAD_PATHS.VISAS });
if (!fs.existsSync(path.join(process.cwd(), UPLOAD_PATHS.VISAS))) {
  fs.mkdirSync(path.join(process.cwd(), UPLOAD_PATHS.VISAS));
}

app.get('/api/trips/visa-requests', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN && req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403).json({ error: 'Unauthorized' });
  const { getVisaRequests } = await import('./trips.js');
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  res.json(await getVisaRequests(limit, offset));
});

app.post('/api/trips/:id/visa-upload', authMiddleware, visaUpload.single('file'), async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN && req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403).json({ error: 'Unauthorized' });

  const tripId = parseInt(req.params.id);
  const { totalCost } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Visa file is required' });
  }

  // Validate cost
  const costNum = parseInt(totalCost, 10);
  if (isNaN(costNum) || costNum <= 0) {
    return res.status(400).json({ error: 'Invalid cost provided' });
  }

  // Upload file
  await pool.query('INSERT INTO file_uploads (trip_id, uploaded_by, file_type, filepath, filename) VALUES ($1,$2,$3,$4,$5)',
    [tripId, req.user.id, FILE_TYPES.VISA, file.path, file.originalname]);

  // Update trip status and cost
  const { uploadVisa } = await import('./trips.js');
  await uploadVisa(tripId, costNum, req.user);

  res.json({ success: true });
});

app.post('/api/trips/:id/close', authMiddleware, async (req: any, res: any) => {
  const { closeTrip } = await import('./trips.js');
  await closeTrip(parseInt(req.params.id), req.user);
  res.json({ success: true });
});

app.post('/api/trips/:id/cancel', authMiddleware, async (req: any, res: any) => {
  try {
    const { requestCancellation } = await import('./trips.js');
    const result = await requestCancellation(parseInt(req.params.id), req.body.reason, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/trips/:id/confirm-cancellation', authMiddleware, async (req: any, res: any) => {
  try {
    if (req.user.role !== USER_ROLES.TRAVEL_ADMIN && req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403).json({ error: 'Unauthorized' });
    const { confirmCancellation } = await import('./trips.js');
    const result = await confirmCancellation(parseInt(req.params.id), req.body.cancellationCost, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/trips/:id/reschedule', authMiddleware, async (req: any, res: any) => {
  try {
    const { rescheduleTrip } = await import('./trips.js');
    const result = await rescheduleTrip(parseInt(req.params.id), req.body.itineraries, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/trips/:id', authMiddleware, async (req: any, res: any) => {
  const { getTripDetails } = await import('./trips.js');
  const trip = await getTripDetails(parseInt(req.params.id), req.user);
  if (!trip) return res.status(404);
  res.json(trip);
});

app.get('/api/dashboard/kpis', authMiddleware, async (req: any, res: any) => {
  const { getKPIs } = await import('./trips.js');
  res.json(await getKPIs(req.user));
});

app.get('/api/analytics', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN && req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403);
  const { getAnalytics } = await import('./trips.js');
  res.json(await getAnalytics());
});



app.get('/api/trips/booked/excel', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.TRAVEL_ADMIN && req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403);
  const { startDate, endDate } = req.query;
  const { generateExcelForBookedTrips } = await import('./trips.js');
  // const { XLSX } = await import('xlsx');
  const buffer = await generateExcelForBookedTrips(startDate as string, endDate as string);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=booked_trips.xlsx');
  res.send(buffer);
});

// User Management APIs
app.get('/api/users', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403);
  const { getAllUsers } = await import('./trips.js');
  res.json(await getAllUsers());
});

app.post('/api/users', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403);
  const { createUser } = await import('./trips.js');
  const result = await createUser(req.body);
  res.json(result);
});

app.put('/api/users/:id', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403);
  const { updateUser } = await import('./trips.js');
  const result = await updateUser(parseInt(req.params.id), req.body);
  res.json(result);
});

app.delete('/api/users/:id', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== USER_ROLES.SUPER_ADMIN) return res.status(403);
  const { deleteUser } = await import('./trips.js');
  await deleteUser(parseInt(req.params.id));
  res.json({ success: true });
});

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

app.use('/api', locationsRouter);

// Global 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));
