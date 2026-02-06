import pool from './database.js';
import type { AuthUser } from './auth.js';
import { sendTripNotificationEmail } from './email.js';

export const getApprovedTrips = async (limit: number = 20, offset: number = 0, statusFilter?: string) => {
  let whereClause = `t.status IN ('APPROVED', 'SELECT_OPTION', 'OPTION_SELECTED', 'BOOKED')`;
  const params: any[] = [limit, offset];

  if (statusFilter) {
    whereClause = `t.status = $3`;
    params.push(statusFilter);
  }

  const result = await pool.query(`
    SELECT
      t.*,
      u.email as requester_email,
      json_agg(DISTINCT it.*) FILTER (WHERE it.id IS NOT NULL) as itineraries,
      COALESCE(json_agg(DISTINCT fu.*) FILTER (WHERE fu.id IS NOT NULL), '[]') as files
    FROM trips t
    LEFT JOIN users u ON t.requester_id = u.userid
    LEFT JOIN itineraries it ON t.id = it.trip_id
    LEFT JOIN file_uploads fu ON t.id = fu.trip_id
    WHERE ${whereClause}
    GROUP BY t.id, u.email
    ORDER BY t.created_at DESC
    LIMIT $1 OFFSET $2
  `, params);

  // Parse JSON fields
  const trips = result.rows.map((trip: any) => ({
    ...trip,
    itineraries: trip.itineraries ? (Array.isArray(trip.itineraries) ? trip.itineraries.filter((it: any) => it && it.type !== null).map((it: any) => ({
      ...it,
      details: typeof it.details === 'string' ? JSON.parse(it.details) : it.details
    })) : []) : [],
    files: trip.files ? (Array.isArray(trip.files) ? trip.files.filter((f: any) => f && f.filename && f.filename !== null) : []) : []
  }));

  return trips;
};

export const getMyTrips = async (userid: string) => {
  const result = await pool.query(`
    SELECT
      t.*,
      json_agg(DISTINCT it.*) as itineraries,
      COALESCE(json_agg(DISTINCT fu.*) FILTER (WHERE fu.id IS NOT NULL), '[]') as files
    FROM trips t
    LEFT JOIN itineraries it ON t.id = it.trip_id AND it.trip_id IS NOT NULL
    LEFT JOIN file_uploads fu ON t.id = fu.trip_id AND fu.trip_id IS NOT NULL
    WHERE t.requester_id = $1
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `, [userid]);

  // Parse JSON and clean up data
  const trips = result.rows.map((trip: any) => ({
    ...trip,
    itineraries: Array.isArray(trip.itineraries)
      ? trip.itineraries.filter((it: any) => it && it.type !== null).map((it: any) => ({
        ...it,
        details: typeof it.details === 'string' ? JSON.parse(it.details) : it.details
      }))
      : [],
    files: Array.isArray(trip.files) && trip.files.length > 0 && trip.files[0] !== null
      ? trip.files.filter((f: any) => f && f.filename && f.filename !== '{}')
      : []
  }));

  return trips;
};

export const getCancelledTripsForAdmin = async (limit: number = 20, offset: number = 0) => {
  // Case 2: Status is CANCELLATION_PENDING OR (Status is CANCELLED AND booked_at IS NOT NULL)
  // This filters out Case 1 cancellations (cancelled before booking) from the Admin view
  const result = await pool.query(`
    SELECT
      t.*,
      u.email as requester_email,
      json_agg(DISTINCT it.*) FILTER (WHERE it.id IS NOT NULL) as itineraries,
      COALESCE(json_agg(DISTINCT fu.*) FILTER (WHERE fu.id IS NOT NULL), '[]') as files
    FROM trips t
    LEFT JOIN users u ON t.requester_id = u.userid
    LEFT JOIN itineraries it ON t.id = it.trip_id
    LEFT JOIN file_uploads fu ON t.id = fu.trip_id
    WHERE t.status = 'CANCELLATION_PENDING' 
       OR (t.status = 'CANCELLED' AND t.booked_at IS NOT NULL)
    GROUP BY t.id, u.email
    ORDER BY t.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  // Parse JSON fields
  const trips = result.rows.map((trip: any) => ({
    ...trip,
    itineraries: trip.itineraries ? (Array.isArray(trip.itineraries) ? trip.itineraries.filter((it: any) => it && it.type !== null).map((it: any) => ({
      ...it,
      details: typeof it.details === 'string' ? JSON.parse(it.details) : it.details
    })) : []) : [],
    files: trip.files ? (Array.isArray(trip.files) ? trip.files.filter((f: any) => f && f.filename && f.filename !== null) : []) : []
  }));

  return trips;
};

export const requestCancellation = async (tripId: number, reason: string, user: any) => {
  const tripResult = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (!tripResult.rows.length) throw new Error('Trip not found');
  const trip = tripResult.rows[0];

  let newStatus = 'CANCELLED';
  let emailSubject = 'Trip Cancelled';
  let emailBody = `Your trip ${trip.reference_no} has been cancelled correctly.\nReason: ${reason}`;

  // Case 2: If status is BOOKED, changes to CANCELLATION_PENDING
  if (trip.status === 'BOOKED') {
    newStatus = 'CANCELLATION_PENDING';
    emailSubject = 'Trip Cancellation Requested';
    emailBody = `Cancellation requested for Trip ${trip.reference_no}.\nReason: ${reason}\nStatus is now pending Travel Admin confirmation.`;
  }

  await pool.query(
    'UPDATE trips SET status = $1, cancellation_reason = $2, updated_at = NOW() WHERE id = $3',
    [newStatus, reason, tripId]
  );

  // Send notifications
  // 1. To Requester
  const requester = await pool.query('SELECT email FROM users WHERE userid = $1', [trip.requester_id]);
  if (requester.rows.length) {
    sendTripNotificationEmail(
      requester.rows[0].email,
      emailSubject,
      trip,
      emailBody,
      undefined,
      undefined,
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-trips`
    );
  }

  // 2. To Travel Admin (If Case 2)
  if (newStatus === 'CANCELLATION_PENDING') {
    const travelAdmin = await pool.query('SELECT email FROM users WHERE role = $1 LIMIT 1', ['travel_admin']);
    if (travelAdmin.rows.length) {
      sendTripNotificationEmail(
        travelAdmin.rows[0].email,
        `ACTION REQUIRED: Cancellation Request for Booked Trip #${trip.reference_no}`,
        trip,
        `Requester has requested cancellation for a booked trip.\nReason: ${reason}\nPlease process cancellation charges.`,
        undefined,
        undefined,
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/travel-management`
      );
    }
  } else {
    // Case 1: Notify Approvers/Admin for info (Optional but good practice)
    // For now keeping it simple as per requirement: "Associated persons will be notified via mail"
  }

  return { success: true, status: newStatus };
};

export const confirmCancellation = async (tripId: number, cancellationCost: number, user: any) => {
  const tripResult = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (!tripResult.rows.length) throw new Error('Trip not found');
  const trip = tripResult.rows[0];

  if (trip.status !== 'CANCELLATION_PENDING') {
    throw new Error('Trip is not pending cancellation');
  }

  await pool.query(
    'UPDATE trips SET status = $1, cancellation_cost = $2, updated_at = NOW() WHERE id = $3',
    ['CANCELLED', cancellationCost, tripId]
  );

  // Notify Requester
  const requester = await pool.query('SELECT email FROM users WHERE userid = $1', [trip.requester_id]);
  if (requester.rows.length) {
    sendTripNotificationEmail(
      requester.rows[0].email,
      `Trip #${trip.reference_no} Cancellation Confirmed`,
      trip,
      `Your trip cancellation has been processed.\nCancellation Charges: ₹${cancellationCost}`,
      undefined,
      undefined,
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-trips`
    );
  }

  return { success: true };
};

export const getVisaRequests = async (limit: number = 20, offset: number = 0) => {
  const result = await pool.query(`
    SELECT
      t.*,
      u.email as requester_email,
      COALESCE(json_agg(DISTINCT fu.*) FILTER (WHERE fu.id IS NOT NULL), '[]') as files
    FROM trips t
    LEFT JOIN users u ON t.requester_id = u.userid
    LEFT JOIN file_uploads fu ON t.id = fu.trip_id
    WHERE t.is_visa_request = TRUE AND t.status IN ('VISA_PENDING', 'VISA_UPLOADED')
    GROUP BY t.id, u.email
    ORDER BY t.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  // Parse JSON fields
  const trips = result.rows.map((trip: any) => ({
    ...trip,
    files: trip.files ? (Array.isArray(trip.files) ? trip.files.filter((f: any) => f && f.filename && f.filename !== null) : []) : []
  }));

  return trips;
};

export const uploadVisa = async (tripId: number, cost: number, user: any) => {
  await pool.query(`UPDATE trips SET status = $1, total_cost = $2 WHERE id = $3`, ['VISA_UPLOADED', cost, tripId]);

  const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  const requester = await pool.query('SELECT email FROM users WHERE userid = $1', [trip.rows[0].requester_id]);

  if (requester.rows.length) {
    sendTripNotificationEmail(
      requester.rows[0].email,
      'Visa Uploaded',
      trip.rows[0],
      'Your Visa has been processed and uploaded.',
      undefined,
      undefined,
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-trips`
    );
  }
};

export const getTripDetails = async (tripId: number, user: any) => {
  const result = await pool.query(`
    SELECT
      t.*,
      json_agg(DISTINCT it.*) FILTER (WHERE it.id IS NOT NULL) as itineraries,
      COALESCE(json_agg(DISTINCT fu.*) FILTER (WHERE fu.id IS NOT NULL), '[]') as files
    FROM trips t
    LEFT JOIN itineraries it ON t.id = it.trip_id
    LEFT JOIN file_uploads fu ON t.id = fu.trip_id
    WHERE t.id = $1
    GROUP BY t.id
  `, [tripId]);

  if (!result.rows.length) return null;

  const tripData = result.rows[0];

  // Check if user can view
  // Check if user can view
  const canView =
    tripData.requester_id === user.userid ||
    user.role === 'travel_admin' ||
    user.role === 'super_admin' ||
    // Check if user is an approver for this trip
    (await pool.query('SELECT 1 FROM approvals WHERE trip_id = $1 AND approver_id = $2', [tripId, user.id])).rows.length > 0;

  if (!canView) {
    return null;
  }

  // Parse JSON data if needed (pg driver usually handles json_agg as objects, but consistency matches other functions)
  const itineraries = tripData.itineraries ? (Array.isArray(tripData.itineraries) ? tripData.itineraries
    .filter((it: any) => it && it.type !== null)
    .map((it: any) => ({
      ...it,
      details: typeof it.details === 'string' ? JSON.parse(it.details) : it.details
    })) : []) : [];

  const files = tripData.files ? (Array.isArray(tripData.files) ? tripData.files.filter((f: any) => f && f.filename && f.filename !== null) : []) : [];

  return { ...tripData, itineraries, files };
};

export const updateTripOption = async (tripId: number, optionText: string, user: any, cost?: number, mmtPayload?: any) => {
  // 1. Calculate next status/approver (RM flow)
  const { status, approverId } = await determineStatusAndApprover(user);

  // 2. Update Trip
  // Store the initial payload from MMT (ticket details + flags)
  // Ensure we are saving the 'mmt_payload' column
  if (cost) {
    await pool.query(`UPDATE trips SET option_selected = $1, status = $2, total_cost = $3, mmt_payload = $4, updated_at = NOW() WHERE id = $5`,
      [optionText, status, cost, mmtPayload ? JSON.stringify(mmtPayload) : null, tripId]);
  } else {
    await pool.query(`UPDATE trips SET option_selected = $1, status = $2, mmt_payload = $3, updated_at = NOW() WHERE id = $4`,
      [optionText, status, mmtPayload ? JSON.stringify(mmtPayload) : null, tripId]);
  }

  // 3. Create Approval Record
  if (approverId) {
    // Determine role purely based on status now
    const approverRole = status === 'RM_PENDING' ? 'reporting_manager' : 'travel_admin';
    await pool.query(`INSERT INTO approvals (trip_id, approver_id, approver_role) VALUES ($1, $2, $3)`, [tripId, approverId, approverRole]);

    // 4. Send Email to Approver
    const approverUser = await pool.query('SELECT email FROM users WHERE id = $1', [approverId]);
    const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
    if (approverUser.rows.length && trip.rows.length) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      sendTripNotificationEmail(
        approverUser.rows[0].email,
        'New Trip Approval Required',
        trip.rows[0],
        `Requester has selected an option via MMT. Please review.\nSelected: ${optionText}\nEst. Cost: ${cost ? cost : 'N/A'}\n\nPayload Track: RM=False, TA=False`,
        undefined,
        undefined,
        `${frontendUrl}/approvals`
      );
    }
  } else {
    // Logic if no approver (e.g. direct to TRAVEL_ADMIN_PENDING or APPROVED if CEO)
    // For now assuming typical flow has RM/TA.
    // If directly APPROVED, we might need to handle booking trigger?
    // But typically leads to TA approval.
    // If no RM, maybe status is APPROVED? check determining logic.
  }
};

export const closeTrip = async (tripId: number, user: any) => {
  const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (trip.rows.length && trip.rows[0].requester_id === user.userid) {
    await pool.query(`UPDATE trips SET status = $1, closed_at = NOW() WHERE id = $2`, ['CLOSED', tripId]);
  }
};

export const rescheduleTrip = async (tripId: number, updatedItineraries: ItineraryItem[], user: any) => {
  // Verify trip ownership and status
  const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (!trip.rows.length) {
    throw new Error('Trip not found');
  }

  const tripData = trip.rows[0];
  if (tripData.requester_id !== user.userid) {
    throw new Error('Unauthorized: You can only reschedule your own trips');
  }

  if (tripData.status !== 'BOOKED') {
    throw new Error('Only BOOKED trips can be rescheduled');
  }

  // Start transaction for data consistency
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete previous receipt and travel options files
    const filesToDelete = await client.query(
      'SELECT filepath FROM file_uploads WHERE trip_id = $1 AND file_type IN ($2, $3)',
      [tripId, 'receipts', 'travel_options']
    );

    // Delete files from file system
    for (const file of filesToDelete.rows) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const fullPath = path.default.join(process.cwd(), file.filepath);
        if (fs.default.existsSync(fullPath)) {
          fs.default.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    // Delete receipt and travel options records from database
    await client.query(
      'DELETE FROM file_uploads WHERE trip_id = $1 AND file_type IN ($2, $3)',
      [tripId, 'receipts', 'travel_options']
    );

    // Update itineraries (only dates and times)
    for (const item of updatedItineraries) {
      // Validate that only date/time fields are being updated
      const currentItinerary = await client.query(
        'SELECT details FROM itineraries WHERE id = $1 AND trip_id = $2',
        [item.id, tripId]
      );

      if (currentItinerary.rows.length === 0) {
        throw new Error('Itinerary item not found');
      }

      const currentDetails = currentItinerary.rows[0].details;

      // Ensure only date/time fields are modified
      const allowedFields = [
        'departureDate', 'returnDate', 'departTime', 'returnTime',
        'checkinDate', 'checkoutDate', 'checkinTime', 'checkoutTime',
        'pickupDate', 'dropoffDate', 'pickupTime', 'dropoffTime'
      ];

      const updatedDetails = { ...currentDetails };

      // Only allow updates to date/time fields
      for (const [key, value] of Object.entries(item.details)) {
        if (allowedFields.includes(key)) {
          // Check if the date/time field actually changed
          const currentValue = currentDetails[key];
          const isDifferent = Array.isArray(value) || Array.isArray(currentValue)
            ? JSON.stringify(value) !== JSON.stringify(currentValue)
            : currentValue !== value;

          if (isDifferent) {
            updatedDetails[key] = value;
          }
        } else {
          // For non-allowed fields, check if they actually changed
          const currentValue = currentDetails[key];
          const isDifferent = Array.isArray(value) || Array.isArray(currentValue)
            ? JSON.stringify(value) !== JSON.stringify(currentValue)
            : currentValue !== value;

          if (isDifferent) {
            throw new Error(`Cannot modify field: ${key}. Only date and time fields can be updated during reschedule.`);
          }
        }
      }

      await client.query(
        'UPDATE itineraries SET details = $1 WHERE id = $2 AND trip_id = $3',
        [JSON.stringify(updatedDetails), item.id, tripId]
      );
    }

    // Reset trip status and clear cost/booking data
    await client.query(
      `UPDATE trips SET
        status = $1,
        total_cost = NULL,
        booked_at = NULL,
        option_selected = NULL
       WHERE id = $2`,
      ['APPROVED', tripId]
    );

    await client.query('COMMIT');

    // Send email notification to Travel Admin
    setImmediate(async () => {
      try {
        const adminResult = await pool.query('SELECT email FROM users WHERE role = $1 LIMIT 1', ['travel_admin']);
        if (adminResult.rows.length > 0) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          sendTripNotificationEmail(
            adminResult.rows[0].email,
            `Trip Rescheduled - ${tripData.reference_no}`,
            tripData,
            `Requester has rescheduled their trip. Please review and upload new travel options.`,
            undefined,
            undefined,
            `${frontendUrl}/travel-management`
          );
        }
      } catch (err) {
        console.error('Error sending reschedule notification:', err);
      }
    });

    return { success: true, message: 'Trip rescheduled successfully' };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateTripOptionStatus = async (tripId: number, status: string) => {
  await pool.query('UPDATE trips SET status = $1 WHERE id = $2', [status, tripId]);
};

export const generateExcelForBookedTrips = async (startDate?: string, endDate?: string) => {
  const { utils, write } = await import('xlsx');

  let query = `
    SELECT 
      t.reference_no,
      t.trip_name,
      t.travel_type,
      t.destination_country,
      t.visa_required,
      t.business_purpose,
      t.status,
      t.total_cost,
      t.created_at,
      t.submitted_at,
      t.booked_at,
      t.option_selected,
      t.booked_at,
      t.option_selected,
      u.username as requester_name,
      u.userid as requester_id,
      u.email as requester_email,
      u.department,
      u.designation,
      u.reporting_manager,
      COALESCE(
        json_agg(
          json_build_object(
            'approver_name', au.username,
            'approver_role', a.approver_role,
            'action', a.action,
            'timestamp', a.timestamp,
            'comments', a.comments
          ) ORDER BY a.timestamp
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'
      ) as approval_history
    FROM trips t
    LEFT JOIN users u ON t.requester_id = u.userid
    LEFT JOIN approvals a ON t.id = a.trip_id
    LEFT JOIN users au ON a.approver_id = au.id
    WHERE t.status = 'BOOKED'
  `;

  const params: any[] = [];
  if (startDate && endDate) {
    query += ` AND t.created_at >= $1 AND t.created_at <= $2`;
    params.push(startDate, endDate);
  }

  query += ` GROUP BY t.id, u.id ORDER BY t.created_at DESC`;

  const trips = await pool.query(query, params);

  const data = trips.rows.map(row => {
    // Format approval history
    const approvals = row.approval_history.map((app: any) => {
      const date = app.timestamp ? new Date(app.timestamp).toLocaleDateString() : 'N/A';
      const role = app.approver_role ? app.approver_role.toUpperCase() : 'N/A';
      const action = app.action ? app.action.toUpperCase() : 'PENDING';
      return `${role} (${app.approver_name}): ${action} on ${date}\nComments: ${app.comments || 'None'}`;
    }).join('\n\n');

    return {
      reference_no: row.reference_no,
      trip_name: row.trip_name,
      travel_type: row.travel_type,
      destination_country: row.destination_country || 'N/A',
      visa_required: row.visa_required ? 'Yes' : 'No',
      business_purpose: row.business_purpose,
      status: row.status,
      total_cost: row.total_cost ? `₹${row.total_cost.toLocaleString('en-IN')}` : 'N/A',
      option_selected: row.option_selected || 'N/A',
      created_at: new Date(row.created_at).toLocaleDateString(),
      submitted_at: row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : 'N/A',
      booked_at: row.booked_at ? new Date(row.booked_at).toLocaleDateString() : 'N/A',
      requester_name: row.requester_name,
      requester_id: row.requester_id,
      email: row.requester_email,
      department: row.department,
      designation: row.designation,
      reporting_manager: row.reporting_manager || 'N/A',
      approval_history: approvals
    };
  });

  const ws = utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 20) }));
  // Make Approval History column wider
  const approvalColIndex = Object.keys(data[0] || {}).indexOf('Approval History');
  if (approvalColIndex !== -1) {
    colWidths[approvalColIndex] = { wch: 50 };
  }
  ws['!cols'] = colWidths;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Booked Trips Report');

  return write(wb, { bookType: 'xlsx', type: 'buffer' });
};

export const autoCloseTrips = async () => {
  try {
    const client = await pool.connect();
    try {
      // Find all BOOKED trips
      const res = await client.query(`
        SELECT t.id, t.reference_no, json_agg(it.details) as itineraries
        FROM trips t
        JOIN itineraries it ON t.id = it.trip_id
        WHERE t.status = 'BOOKED'
        GROUP BY t.id
      `);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const trip of res.rows) {
        let maxDate: Date | null = null;

        // Find the latest date in the itinerary
        for (const details of trip.itineraries) {
          let dateStr = null;
          // Check various date fields based on type (or just check all relevant fields)
          // Flight: returnDate > departureDate
          if (details.returnDate) dateStr = details.returnDate;
          else if (details.departureDate) dateStr = details.departureDate;
          else if (details.checkoutDate) dateStr = details.checkoutDate; // Hotel
          else if (details.checkinDate) dateStr = details.checkinDate;
          else if (details.dropoffDate) dateStr = details.dropoffDate; // Car
          else if (details.pickupDate) dateStr = details.pickupDate;

          if (dateStr) {
            const d = new Date(dateStr);
            if (!maxDate || d > maxDate) {
              maxDate = d;
            }
          }
        }

        // If trip has dates and the last date is in the past (< today)
        if (maxDate && maxDate < today) {
          console.log(`Auto-closing trip ${trip.reference_no} (ID: ${trip.id}). Max Date: ${maxDate.toDateString()}`);
          await client.query(`UPDATE trips SET status = 'CLOSED', closed_at = NOW(), updated_at = NOW() WHERE id = $1`, [trip.id]);
        }
      }

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in autoCloseTrips:', error);
  }
};


export const getAllUsers = async () => {
  return await pool.query('SELECT id, username, userid, email, designation, department, role, created_at FROM users ORDER BY created_at DESC');
};

export const createUser = async (userData: any) => {
  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.default.hash(userData.password || 'TempPass123', 10);
  return await pool.query('INSERT INTO users (username, userid, email, designation, department, reporting_manager, reporting_manager_id, role, encrypted_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
    [userData.username, userData.userid, userData.email, userData.designation, userData.department, userData.reporting_manager, userData.reporting_manager_id, userData.role, hashed]);
};

export const updateUser = async (id: number, userData: any) => {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (userData.username) { fields.push(`username = $${i++}`); values.push(userData.username); }
  if (userData.email) { fields.push(`email = $${i++}`); values.push(userData.email); }
  if (userData.designation) { fields.push(`designation = $${i++}`); values.push(userData.designation); }
  if (userData.department) { fields.push(`department = $${i++}`); values.push(userData.department); }
  if (userData.reporting_manager !== undefined) { fields.push(`reporting_manager = $${i++}`); values.push(userData.reporting_manager); }
  if (userData.reporting_manager_id !== undefined) { fields.push(`reporting_manager_id = $${i++}`); values.push(userData.reporting_manager_id); }
  if (userData.role) { fields.push(`role = $${i++}`); values.push(userData.role); }
  if (userData.password) {
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(userData.password, 10);
    fields.push(`encrypted_password = $${i++}`);
    values.push(hashed);
  }

  if (fields.length === 0) return;

  values.push(id);
  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`;
  return await pool.query(query, values);
};

export const deleteUser = async (id: number) => {
  return await pool.query('DELETE FROM users WHERE id = $1', [id]);
};

export const getKPIs = async (user: any) => {
  const isAdmin = user.role === 'super_admin' || user.role === 'travel_admin';

  let pendingRes, myTripsRes, activeTripsRes, recentTrips, recentApprovals;
  let nextTripRes, statusStatsRes, annualSpendRes;

  if (isAdmin) {
    // Global KPIs for admins
    pendingRes = await pool.query('SELECT COUNT(*) as count FROM approvals WHERE action IS NULL');
    myTripsRes = await pool.query('SELECT COUNT(*) as count FROM trips');
    activeTripsRes = await pool.query(`
      SELECT COUNT(*) as count
      FROM trips
      WHERE status NOT IN ('CANCELLED', 'REJECTED', 'CLOSED', 'DRAFT')
    `);

    // Recent activity: recent trips and approvals in the system
    recentTrips = await pool.query(`
      SELECT
        t.id,
        'trip' as type,
        t.updated_at as timestamp,
        t.status,
        t.reference_no,
        t.trip_name,
        CONCAT(t.requester_name, ' updated this trip') as description
      FROM trips t
      ORDER BY t.updated_at DESC
      LIMIT 3
    `);

    recentApprovals = await pool.query(`
      SELECT
        t.id as trip_id,
        'approval' as type,
        a.timestamp,
        a.action,
        t.reference_no,
        t.trip_name,
        t.requester_name as initiator,
        CASE
          WHEN a.action IS NULL THEN CONCAT(u.username, ' has a pending approval')
          WHEN a.action = 'accept' THEN CONCAT(u.username, ' approved this request')
          WHEN a.action = 'reject' THEN CONCAT(u.username, ' rejected this request')
          WHEN a.action = 'send_back' THEN CONCAT(u.username, ' sent this back for edit')
        END as description
      FROM approvals a
      JOIN trips t ON a.trip_id = t.id
      JOIN users u ON a.approver_id = u.id
      ORDER BY a.timestamp DESC
      LIMIT 3
    `);

    // Admin Next Trip (Maybe global next trip? Or personal? Let's keep it personal for now or just generic empty)
    // For admin dashboard, maybe showing "Upcoming Trips" across org is too much for a single card.
    // Let's query for ANY upcoming booked trip
    nextTripRes = await pool.query(`
      SELECT * FROM trips WHERE status = 'BOOKED' AND expected_journey_date >= CURRENT_DATE ORDER BY expected_journey_date ASC LIMIT 1
    `);

    statusStatsRes = await pool.query('SELECT status, COUNT(*) as count FROM trips GROUP BY status');

    // Annual Spend -> Changed to Total Spend given test data constraints
    annualSpendRes = await pool.query(`
      SELECT SUM(total_cost) as total 
      FROM trips 
      WHERE status = 'BOOKED' 
    `);
  } else {
    // User-specific KPIs
    pendingRes = await pool.query('SELECT COUNT(*) as count FROM approvals WHERE approver_id = $1 AND action IS NULL', [user.id]);
    myTripsRes = await pool.query('SELECT COUNT(*) as count FROM trips WHERE requester_id = $1', [user.userid]);
    activeTripsRes = await pool.query(`
      SELECT COUNT(*) as count
      FROM trips
      WHERE requester_id = $1
        AND status NOT IN ('CANCELLED', 'REJECTED', 'CLOSED', 'DRAFT')
    `, [user.userid]);

    // Recent Activity Feed
    // 1. User's recent trips (updated recently)
    recentTrips = await pool.query(`
      SELECT
        id,
        'trip' as type,
        updated_at as timestamp,
        status,
        reference_no,
        trip_name,
        'You updated this trip' as description
      FROM trips
      WHERE requester_id = $1
      ORDER BY updated_at DESC
      LIMIT 3
    `, [user.userid]);

    // 2. Approvals assigned to user (or acted upon)
    recentApprovals = await pool.query(`
      SELECT
        t.id as trip_id,
        'approval' as type,
        a.timestamp,
        a.action,
        t.reference_no,
        t.trip_name,
        t.requester_name as initiator,
        CASE
          WHEN a.action IS NULL THEN 'Pending your approval'
          WHEN a.action = 'accept' THEN 'You approved this request'
          WHEN a.action = 'reject' THEN 'You rejected this request'
          WHEN a.action = 'send_back' THEN 'You sent this back for edit'
        END as description
      FROM approvals a
      JOIN trips t ON a.trip_id = t.id
      WHERE a.approver_id = $1
      ORDER BY a.timestamp DESC
      LIMIT 3
    `, [user.id]);

    nextTripRes = await pool.query(`
      SELECT * 
      FROM trips 
      WHERE requester_id = $1 
        AND status = 'BOOKED' 
        AND expected_journey_date >= CURRENT_DATE
      ORDER BY expected_journey_date ASC 
      LIMIT 1
    `, [user.userid]);

    statusStatsRes = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM trips 
      WHERE requester_id = $1 
      GROUP BY status
    `, [user.userid]);

    // Annual Spend -> Changed to Total Spend given test data constraints
    annualSpendRes = await pool.query(`
      SELECT SUM(total_cost) as total 
      FROM trips 
      WHERE requester_id = $1 
        AND status = 'BOOKED' 
    `, [user.userid]);
  }

  // Combine and sort
  const activity = [...recentTrips.rows, ...recentApprovals.rows]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return {
    pendingApprovals: parseInt(pendingRes.rows[0].count as string),
    myTrips: parseInt(myTripsRes.rows[0].count as string),
    activeTrips: parseInt(activeTripsRes.rows[0].count as string),
    nextTrip: nextTripRes ? (nextTripRes.rows[0] || null) : null,
    statusStats: statusStatsRes ? statusStatsRes.rows : [],
    annualSpend: annualSpendRes ? (annualSpendRes.rows[0]?.total || 0) : 0,
    recentActivity: activity
  };
};

export const getAnalytics = async () => {
  const [
    statusStats,
    monthlyStats,
    topDestinations,
    travelTypeStats,
    monthlySpendStats,
    departmentSpendStats,
    roleSpendStats,
    totalSpend
  ] = await Promise.all([
    pool.query('SELECT status, COUNT(*) as count FROM trips GROUP BY status'),
    pool.query("SELECT EXTRACT(YEAR FROM created_at) as year, EXTRACT(MONTH FROM created_at) as month, COUNT(*) as count FROM trips WHERE status = 'BOOKED' GROUP BY year, month ORDER BY year, month"),
    pool.query("SELECT destination_country as city, COUNT(*) as count FROM trips WHERE status = 'BOOKED' AND destination_country IS NOT NULL AND destination_country != '' GROUP BY destination_country ORDER BY count DESC LIMIT 10"),
    pool.query("SELECT travel_type, COUNT(*) as count FROM trips WHERE status = 'BOOKED' GROUP BY travel_type"),
    pool.query(`
      SELECT
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month,
        SUM(total_cost) as total_spend,
        COUNT(*) as booked_trips
      FROM trips
      WHERE status = 'BOOKED' AND total_cost IS NOT NULL
      GROUP BY year, month
      ORDER BY year, month
    `),
    pool.query(`
      SELECT
        department,
        COUNT(*) as trips_count,
        SUM(total_cost) as total_spend,
        AVG(total_cost) as avg_spend
      FROM trips
      WHERE status = 'BOOKED' AND total_cost IS NOT NULL AND department IS NOT NULL
      GROUP BY department
      ORDER BY total_spend DESC
    `),
    pool.query(`
      SELECT
        u.role,
        COUNT(DISTINCT t.id) as trips_count,
        SUM(t.total_cost) as total_spend,
        AVG(t.total_cost) as avg_spend
      FROM trips t
      JOIN users u ON t.requester_id = u.userid
      WHERE t.status = 'BOOKED' AND t.total_cost IS NOT NULL
      GROUP BY u.role
      ORDER BY total_spend DESC
    `),
    pool.query(`SELECT SUM(total_cost) as total FROM trips WHERE status = 'BOOKED' AND total_cost IS NOT NULL`)
  ]);

  return {
    statusStats: statusStats.rows,
    monthlyStats: monthlyStats.rows,
    topDestinations: topDestinations.rows,
    travelTypeStats: travelTypeStats.rows,
    monthlySpendStats: monthlySpendStats.rows,
    departmentSpendStats: departmentSpendStats.rows,
    roleSpendStats: roleSpendStats.rows,
    totalSpend: totalSpend.rows[0]?.total || 0
  };
};

export interface CreateTripRequest {
  tripName: string;
  travelType: 'Domestic' | 'International';
  destinationCountry?: string;
  visaRequired?: boolean;
  businessPurpose?: string;
  itineraries: ItineraryItem[];
  isVisaRequest?: boolean;
  expectedJourneyDate?: string;
  intent?: 'save' | 'mmt_redirect'; // New field for MMT flow
}

export interface ItineraryItem {
  id: number;
  type: 'flight' | 'hotel' | 'car' | 'train';
  details: any; // JSON
}

export const generateReferenceNo = () => {
  // Format: T-X7Y8Z9 (8 chars)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  return `TRIP-${dateStr}-${random}`; // TRIP-231025-X7Y8Z9 (approx 19 chars) 
};

// STRICT USER -> RM -> TA FLOW
export const determineStatusAndApprover = async (user: AuthUser) => {

  // 1. Direct Travel Admin Check (Auto-Approve or Booking Ready)
  if (user.role === 'travel_admin') {
    return { status: 'APPROVED', approverId: null };
  }

  // 2. Dynamic Hierarchy: Check for Reporting Manager (RM)
  // Regardless of the user's title (Manager, Employee, etc.), if they have a manager_id, that person is the RM.
  if (user.reporting_manager_id) {
    const managerQuery = await pool.query('SELECT id FROM users WHERE userid = $1', [user.reporting_manager_id]);
    if (managerQuery.rows.length) {
      // Found an RM. Route to them.
      // We set the status to RM_PENDING to indicate waiting for *some* manager.
      return {
        status: 'RM_PENDING',
        approverId: managerQuery.rows[0].id
      };
    }
  }

  // 3. Fallback: No RM found? Go straight to Travel Admin.
  // This covers top-level users (like the CEO/BOSS) or users with missing manager link.
  const taQuery = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['travel_admin']);
  return {
    status: 'TRAVEL_ADMIN_PENDING',
    approverId: taQuery.rows[0]?.id || null
  };
};

export const createTrip = async (user: AuthUser, tripData: CreateTripRequest) => {
  const referenceNo = generateReferenceNo();

  const { status, approverId } = await determineStatusAndApprover(user);

  // If directly approved and it's a visa request, set to VISA_PENDING
  let initialStatus = status;
  let finalApproverId = approverId;

  // MMT Flow Modification
  if (!tripData.isVisaRequest && (tripData.intent === 'save' || tripData.intent === 'mmt_redirect')) {
    initialStatus = 'SELECT_OPTION';
    finalApproverId = null; // No approval needed yet
  } else if (status === 'APPROVED' && tripData.isVisaRequest) {
    initialStatus = 'VISA_PENDING';
  }

  const tripInsert = await pool.query(`
    INSERT INTO trips (
      reference_no, requester_name, requester_id, designation, department,
      trip_name, travel_type, destination_country, visa_required,
      business_purpose, status, created_at, submitted_at,
      is_visa_request, expected_journey_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
  `, [
    referenceNo,
    user.username,
    user.userid,
    user.designation,
    user.department,
    tripData.tripName,
    tripData.travelType || 'International', // Visa always implies International usually
    tripData.destinationCountry,
    tripData.visaRequired ?? true, // Default to true for Visa Request
    tripData.businessPurpose,
    initialStatus,
    new Date(),
    new Date(),
    tripData.isVisaRequest || false,
    tripData.expectedJourneyDate ? new Date(tripData.expectedJourneyDate) : null
  ]);

  const tripId = tripInsert.rows[0].id;

  // Insert itineraries
  for (const item of tripData.itineraries) {
    await pool.query(`
      INSERT INTO itineraries (trip_id, type, details) VALUES ($1, $2, $3)
    `, [tripId, item.type, JSON.stringify(item.details)]);
  }

  // Insert approval if needed
  if (finalApproverId) {
    const approverRole = status === 'RM_PENDING' ? 'reporting_manager' : 'travel_admin';
    await pool.query(`INSERT INTO approvals (trip_id, approver_id, approver_role) VALUES ($1, $2, $3)`, [tripId, finalApproverId, approverRole]);
  }

  // Send emails asynchronously
  setImmediate(async () => {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const tripDetails = {
        referenceNo,
        tripName: tripData.tripName,
        requesterName: user.username,
        userid: user.userid,
        designation: user.designation,
        department: user.department,
        status,
        travelType: tripData.travelType,
        destinationCountry: tripData.destinationCountry,
        businessPurpose: tripData.businessPurpose,
        itineraries: tripData.itineraries
      };

      // Email to Employee
      sendTripNotificationEmail(
        user.email,
        'Trip Submitted Successfully',
        tripDetails,
        'Your trip request has been submitted.',
        undefined,
        undefined,
        `${frontendUrl}/my-trips`
      );

      // Email to Approver
      if (finalApproverId) {
        const approverUser = await pool.query('SELECT email FROM users WHERE id = $1', [finalApproverId]);
        if (approverUser.rows.length) {
          sendTripNotificationEmail(
            approverUser.rows[0].email,
            'New Trip Approval Required',
            tripDetails,
            'A new trip request requires your approval.',
            undefined,
            undefined,
            `${frontendUrl}/approvals`
          );
        }
      }
    } catch (err) {
      console.error('Email send error:', err);
    }
  });

  return { tripId, referenceNo, status };
};
