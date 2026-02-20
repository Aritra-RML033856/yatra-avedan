export const USER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    TRAVEL_ADMIN: 'travel_admin',
    REPORTING_MANAGER: 'reporting_manager',
    EMPLOYEE: 'employee',
};

export const TRIP_STATUS = {
    DRAFT: 'DRAFT',
    RM_PENDING: 'RM_PENDING',
    TRAVEL_ADMIN_PENDING: 'TRAVEL_ADMIN_PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    SELECT_OPTION: 'SELECT_OPTION',
    OPTION_SELECTED: 'OPTION_SELECTED',
    BOOKED: 'BOOKED',
    CLOSED: 'CLOSED',
    CANCELLED: 'CANCELLED',
    CANCELLATION_PENDING: 'CANCELLATION_PENDING',
    VISA_PENDING: 'VISA_PENDING',
    VISA_UPLOADED: 'VISA_UPLOADED',
    EDIT: 'EDIT',
    PENDING: 'PENDING',
};

export const ITINERARY_TYPES = {
    FLIGHT: 'flight',
    HOTEL: 'hotel',
    CAR: 'car',
    TRAIN: 'train',
};

export const FILE_TYPES = {
    VISA: 'visa',
    TRAVEL_OPTIONS: 'travel_options',
    RECEIPTS: 'receipts',
    INVOICE: 'invoice',
};

export const UPLOAD_PATHS = {
    BASE: 'uploads',
    TRAVEL_OPTIONS: 'uploads/travel_options/',
    RECEIPTS: 'uploads/receipts/',
    VISAS: 'uploads/visas/',
};

export const EMAIL_SUBJECTS = {
    TRIP_CANCELLED: 'Trip Cancelled',
    TRIP_CANCELLATION_REQUESTED: 'Trip Cancellation Requested',
    CANCELLATION_ACTION_REQUIRED: 'ACTION REQUIRED: Cancellation Request for Booked Trip',
    CANCELLATION_CONFIRMED: 'Trip Cancellation Confirmed',
    VISA_UPLOADED: 'Visa Uploaded',
    VISA_PROCESSED: 'Visa Processed & Attachment Ready',
    NEW_APPROVAL_REQUIRED: 'New Trip Approval Required',
    TRIP_RESCHEDULED: 'Trip Rescheduled',
    BOOKING_CONFIRMED: 'Booking Confirmed & Receipts Attached',
    OPTIONS_AVAILABLE: 'Travel Options Available',
    TRIP_APPROVED: 'Trip Approved',
    TRIP_REJECTED: 'Trip Rejected',
    TRIP_SENT_BACK: 'Trip Sent Back for Edit',
    BOOKING_CONFIRMED_MMT: 'Trip Booking Confirmed (MMT)',
};
