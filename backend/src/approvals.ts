import pool from './database.js';
import type { AuthUser } from './auth.js';
import { sendTripNotificationEmail, prepareFileAttachments } from './email.js';
import {
  TRIP_STATUS,
  USER_ROLES,
  EMAIL_SUBJECTS
} from './constants.js';

export const getApprovalCounts = async (userId: number) => {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE action IS NULL) as pending,
      COUNT(*) FILTER (WHERE action = 'accept') as approved,
      COUNT(*) FILTER (WHERE action = 'reject') as rejected
    FROM approvals
    WHERE approver_id = $1
  `, [userId]);

  return {
    pending: parseInt(result.rows[0].pending),
    approved: parseInt(result.rows[0].approved),
    rejected: parseInt(result.rows[0].rejected)
  };
};

export const getApprovals = async (userId: number, itemsPerPage: number = 20, offset: number = 0, filterAction?: 'pending' | 'approved' | 'rejected') => {
  // Get approval info with action details based on filter
  let whereClause = `a.approver_id = $1`;
  const params: any[] = [userId, itemsPerPage, offset];

  if (filterAction === 'pending') {
    whereClause += ` AND a.action IS NULL`;
  } else if (filterAction === 'approved') {
    whereClause += ` AND a.action = 'accept'`;
  } else if (filterAction === 'rejected') {
    whereClause += ` AND a.action = 'reject'`;
  }
  // If no filter is provided, we might want all (history), or default to pending. 
  // For infinite scroll per tab, the frontend will always provide a filter.
  // If strictly 'history=true' was used before, it meant all actions. 
  // We can keep a simplified approach: specific filter is prioritized.

  const approvalsResult = await pool.query(`
    SELECT
      a.id,
      a.trip_id,
      a.approver_role,
      a.timestamp,
      a.action,
      a.comments,
      a.timestamp as action_timestamp,
      t.reference_no,
      t.trip_name,
      t.requester_name,
      t.requester_id,
      t.designation,
      t.department,
      t.travel_type,
      t.destination_country,
      t.visa_required,
      t.business_purpose,
      t.status,
      t.created_at,
      t.option_selected,
      t.total_cost,
      t.mmt_payload,
      json_agg(DISTINCT it.*) FILTER (WHERE it.id IS NOT NULL) as itineraries
    FROM approvals a
    JOIN trips t ON a.trip_id = t.id
    LEFT JOIN itineraries it ON t.id = it.trip_id
    WHERE ${whereClause}
    GROUP BY
      a.id,
      a.trip_id,
      a.approver_role,
      a.timestamp,
      a.action,
      a.comments,
      a.timestamp,
      t.reference_no,
      t.trip_name,
      t.requester_name,
      t.requester_id,
      t.designation,
      t.department,
      t.travel_type,
      t.destination_country,
      t.visa_required,
      t.business_purpose,
      t.status,
      t.created_at,
      t.option_selected,
      t.total_cost,
      t.mmt_payload
    ORDER BY a.timestamp DESC
    LIMIT $2 OFFSET $3
  `, params);

  // Parse JSON fields
  const approvals = approvalsResult.rows.map((approval: any) => ({
    ...approval,
    itineraries: approval.itineraries ? (Array.isArray(approval.itineraries) ? approval.itineraries
      .filter((it: any) => it && it.type !== null)
      .map((it: any) => ({
        ...it,
        details: typeof it.details === 'string' ? JSON.parse(it.details) : it.details
      })) : []) : []
  }));

  return approvals;
};

// Legacy function for backward compatibility
export const getPendingApprovals = async (userId: number) => {
  return await getApprovals(userId, 20, 0, 'pending');
};

export const approveTrip = async (approvalId: number, user: AuthUser, action: 'accept' | 'reject' | 'send_back', comments?: string) => {
  const approval = await pool.query(`
    SELECT
      a.trip_id, a.approver_role,
      t.reference_no, t.trip_name, t.requester_name, t.requester_id, t.designation, t.department,
      t.travel_type, t.destination_country, t.business_purpose, t.status, t.created_at, t.option_selected,
      t.is_visa_request,
      u.email as requester_email
    FROM approvals a
    JOIN trips t ON a.trip_id = t.id
    JOIN users u ON t.requester_id = u.userid
    WHERE a.id = $1
  `, [approvalId]);

  if (!approval.rows.length) throw new Error('Approval not found');

  const trip = approval.rows[0];

  // Update approval
  await pool.query(`
    UPDATE approvals SET action = $1, comments = $2, timestamp = NOW() WHERE id = $3
  `, [action, comments, approvalId]);

  const requesterEmail = trip.requester_email;
  const travelAdminEmail = 'travel@company.com'; // Placeholder, need to get from DB
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (action === 'accept') {
    if (trip.approver_role === USER_ROLES.REPORTING_MANAGER) {
      // Reporting Manager Approved -> Go to Travel Admin
      const travelAdmin = await pool.query('SELECT id, email FROM users WHERE role = $1 LIMIT 1', [USER_ROLES.TRAVEL_ADMIN]);
      if (travelAdmin.rows.length) {
        // Manager Approved: Update mmt_payload.rm_approved = true
        const currentPayload = trip.mmt_payload || {};
        currentPayload.rm_approved = true;

        await pool.query('UPDATE trips SET status = $1, mmt_payload = $2 WHERE id = $3',
          [TRIP_STATUS.TRAVEL_ADMIN_PENDING, JSON.stringify(currentPayload), trip.trip_id]);

        await pool.query('INSERT INTO approvals (trip_id, approver_id, approver_role) VALUES ($1, $2, $3)', [trip.trip_id, travelAdmin.rows[0].id, USER_ROLES.TRAVEL_ADMIN]);

        sendTripNotificationEmail(
          travelAdmin.rows[0].email,
          trip.option_selected ? `${EMAIL_SUBJECTS.NEW_APPROVAL_REQUIRED} (MMT)` : EMAIL_SUBJECTS.NEW_APPROVAL_REQUIRED,
          trip,
          `RM Approved. Please Finalize.\n\nPayload Track: RM=True, TA=False`,
          undefined,
          undefined,
          `${frontendUrl}/approvals`
        );
      } else {
        // Fallback if no TA exists (unlikely in prod but safe)
        await pool.query('UPDATE trips SET status = $1 WHERE id = $2', [TRIP_STATUS.APPROVED, trip.trip_id]);
      }

    } else if (trip.approver_role === USER_ROLES.TRAVEL_ADMIN) {
      // Travel Admin approved
      if (trip.option_selected) {
        // MMT Flow: Trigger Booking
        // TA Approved: Update mmt_payload.ta_approved = true
        const currentPayload = trip.mmt_payload || {};
        currentPayload.ta_approved = true;

        // Call MMT /complete endpoint (Simulated)
        try {
          // Using axios for the request
          const axios = (await import('axios')).default;
          await axios.post('http://localhost:4000/complete', currentPayload);
        } catch (e) {
          console.error("Failed to notify MMT Mock:", e);
        }


        await pool.query('UPDATE trips SET status = $1, booked_at = NOW(), mmt_payload = $2 WHERE id = $3',
          [TRIP_STATUS.BOOKED, JSON.stringify(currentPayload), trip.trip_id]);

        // Send Ticket/Invoice Emails (Simulated)
        sendTripNotificationEmail(
          requesterEmail,
          EMAIL_SUBJECTS.BOOKING_CONFIRMED_MMT,
          trip,
          `Your trip has been booked successfully via MMT. Tickets are attached.\n\nPayload Track: RM=True, TA=True`,
          undefined,
          undefined,
          `${frontendUrl}/my-trips`
        );
      } else {
        // Legacy Flow: Ready for options upload/manual processing
        // If Visa Request, maybe move to VISA_PENDING? assuming standard flow for now.
        const isVisaRequest = trip.is_visa_request || false;
        const nextStatus = isVisaRequest ? TRIP_STATUS.VISA_PENDING : TRIP_STATUS.APPROVED;

        await pool.query('UPDATE trips SET status = $1 WHERE id = $2', [nextStatus, trip.trip_id]);

        sendTripNotificationEmail(
          requesterEmail,
          EMAIL_SUBJECTS.TRIP_APPROVED,
          trip,
          'Travel Admin reviewed your request.',
          undefined,
          undefined,
          `${frontendUrl}/my-trips`
        );
      }
    }
    // Removed generic "Trip Progress Update" email for accept actions
  } else if (action === 'reject') {
    await pool.query('UPDATE trips SET status = $1 WHERE id = $2', [TRIP_STATUS.REJECTED, trip.trip_id]);
    sendTripNotificationEmail(
      requesterEmail,
      EMAIL_SUBJECTS.TRIP_REJECTED,
      trip,
      'Trip rejected',
      undefined,
      undefined,
      `${frontendUrl}/my-trips`
    );
  } else if (action === 'send_back') {
    await pool.query('UPDATE trips SET status = $1 WHERE id = $2', [TRIP_STATUS.EDIT, trip.trip_id]);
    sendTripNotificationEmail(
      requesterEmail,
      EMAIL_SUBJECTS.TRIP_SENT_BACK,
      trip,
      'Please edit and resubmit',
      undefined,
      undefined,
      `${frontendUrl}/my-trips`
    );
  }

  return { message: `Trip ${action}ed` };
};
