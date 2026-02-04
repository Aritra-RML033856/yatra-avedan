import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import type { AuthUser } from './auth.js';
import fs from 'fs';
import path from 'path';

console.log('Initializing Outlook SMTP email service...');
console.log('EMAIL_USER configured:', !!process.env.EMAIL_USER);

// Initialize Nodemailer transporter for Outlook
const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates if needed
  }
});

// Helper function to prepare attachments for Nodemailer
export const prepareFileAttachments = async (fileRecords: any[]): Promise<Array<{ filename: string, content: Buffer | string }>> => {
  const attachments: Array<{ filename: string, content: Buffer | string }> = [];

  for (const file of fileRecords) {
    try {
      // Check if the file path exists and read it
      if (fs.existsSync(file.filepath)) {
        const fileContent = fs.readFileSync(file.filepath);
        attachments.push({
          filename: file.filename,
          content: fileContent
        });
        console.log(`Attached file: ${file.filename}`);
      } else {
        console.warn(`File not found: ${file.filepath}`);
      }
    } catch (error) {
      console.error(`Error reading attachment ${file.filename}:`, error);
    }
  }

  return attachments;
};

// Email template for TripFlow notifications
const createTripEmailHTML = (tripData: any, action?: string, attachments?: any[], subject?: string, actionLink?: string) => {
  const { reference_no: referenceNo, trip_name: tripName, requester_name: requesterName, requesterName: requesterNameAlt, requester_id: requesterId, requester_email: requesterEmail, userid: userIdAlt, department, designation, status, business_purpose: businessPurpose, travel_type: travelType, destination_country: destinationCountry, itineraries } = tripData;
  const nameToDisplay = requesterName || requesterNameAlt || 'N/A';
  const idToDisplay = requesterId || userIdAlt || 'N/A';

  const statusColors = {
    PENDING: '#ffa726',
    RM_PENDING: '#42a5f5',
    TRAVEL_ADMIN_PENDING: '#26a69a',
    APPROVED: '#66bb6a',
    SELECT_OPTION: '#ff7043',
    OPTION_SELECTED: '#8d6e63',
    BOOKED: '#26a69a',
    CLOSED: '#546e7a',
    REJECTED: '#ef5350',
    EDIT: '#ffee58'
  };

  const currentStatusColor = statusColors[status as keyof typeof statusColors] || '#757575';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TripFlow Notification</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #1976d2, #42a5f5); color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; }
        .trip-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; background: #fafafa; }
        .action-item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .btn { display: inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .attachment-list { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .attachment-item { padding: 5px 0; }
        ${attachments && attachments.length > 0 ? '.attachment-icon { color: #1976d2; margin-right: 8px; }' : ''}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈️ यात्राAvedan Update</h1>
          <p>Travel Request Management System</p>
        </div>

        <div class="content">
          <h2>${subject || 'Trip Request Update'}</h2>
          ${action ? `<p><strong>Action Taken:</strong> ${action}</p>` : ''}

          <div class="trip-card">
            <h3 style="margin-top: 0; color: #1976d2;">📋 Trip Details</h3>

            <div class="action-item">
              <strong>Reference Number:</strong> #${referenceNo}
            </div>

            <div class="action-item">
              <strong>Trip Name:</strong> ${tripName}
            </div>

            <div class="action-item">
              <strong>Requester:</strong> ${nameToDisplay} (${idToDisplay}, ${designation})
            </div>

            <div class="action-item">
              <strong>Department:</strong> ${department || 'N/A'}
            </div>

            <div class="action-item">
              <strong>Travel Type:</strong> ${travelType || 'N/A'}
              ${destinationCountry ? ` | <strong>Destination:</strong> 🇮🇳 ${destinationCountry}` : ''}
            </div>

            ${businessPurpose ? `
            <div class="action-item">
              <strong>Business Purpose:</strong> ${businessPurpose}
            </div>
            ` : ''}

            ${itineraries && itineraries.length > 0 ? `
            <div class="action-item" style="border-bottom: none;">
              <strong>Detailed Itinerary:</strong><br>
              ${itineraries.map((it: any, idx: number) => {
    const details = it.details;
    const typeEmoji = it.type === 'flight' ? '✈️' : it.type === 'hotel' ? '🏨' : it.type === 'car' ? '🚗' : it.type === 'train' ? '🚂' : '📋';
    let formattedDetails = '';
    if (typeof details === 'object') {
      formattedDetails = Object.entries(details).map(([key, value]) =>
        `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`
      ).join(' | ');
    } else {
      formattedDetails = details;
    }
    return `<div style="margin: 5px 0; padding: 8px; background: #fff; border-left: 4px solid #1976d2; border-radius: 4px;">
                  ${typeEmoji} <strong>${it.type.toUpperCase()} ${idx + 1}:</strong> ${formattedDetails}
                </div>`;
  }).join('')}
            </div>
            ` : ''}
          </div>

          ${attachments && attachments.length > 0 ? `
          <div class="attachment-list">
            <h4>📎 Attached Files</h4>
            ${attachments.map((file, index) =>
    `<div class="attachment-item">
                <span class="attachment-icon">📄</span>
                ${file.filename}
              </div>`
  ).join('')}
          </div>
          ` : ''}

          ${actionLink ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${actionLink}" class="btn">View Details & Take Action</a>
            <p style="font-size: 12px; color: #999; margin-top: 5px;">Or copy this link: <a href="${actionLink}" style="color: #1976d2;">${actionLink}</a></p>
          </div>
          ` : ''}

          <div style="background: #e8f5e8; border: 1px solid #4caf50; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <strong>ℹ️ Important:</strong> This email contains important information about the trip request.
            Please review the details carefully.
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="#" class="btn">View Full Trip Details</a>
          </div>
        </div>

        <div class="footer">
        <p style="font-size: 12px;">
        This is an automatically generated email - Please do not reply to it. If you have any queries please reach out to Admin Team.
        </p>
        <p>

          Sent on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string, content: Buffer | string, path?: string }>,
  cc?: string | string[]
) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"TripFlow" <${process.env.EMAIL_USER}>`,
      to: to,
      cc: cc,
      subject: subject,
      html: html,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent via Outlook:', info.messageId);
    return info;
  } catch (error) {
    console.error('Outlook email error:', error);
    throw error;
  }
};

export const sendTripNotificationEmail = async (
  to: AuthUser | string,
  subject: string,
  tripDetails: any,
  action?: string,
  attachments?: Array<{ filename: string, content: Buffer | string, path?: string }>,
  cc?: string | string[],
  actionLink?: string
) => {
  const emailAddress = typeof to === 'string' ? to : to.email;

  // Enhanced HTML template with full trip details
  const html = createTripEmailHTML(tripDetails, action, attachments, subject, actionLink);

  console.log(`Sending enhanced email to ${emailAddress}:`, subject);
  console.log(`Trip: ${tripDetails.reference_no} - ${tripDetails.status}`);

  return await sendEmail(emailAddress, subject, html, attachments, cc);
};
