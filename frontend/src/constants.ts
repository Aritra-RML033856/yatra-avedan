export const APP_CONFIG = {
    API_PORT: 5000,
    MMT_PORT: 4000,
    FRONTEND_PORT: 3002,
};

export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${APP_CONFIG.API_PORT}`;

export const USER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    TRAVEL_ADMIN: 'travel_admin',
    REPORTING_MANAGER: 'reporting_manager',
    EMPLOYEE: 'employee', // Implicit role usually
};

export const TRIP_TYPES = {
    DOMESTIC: 'Domestic',
    INTERNATIONAL: 'International',
};

export const ITINERARY_TYPES = {
    FLIGHT: 'flight',
    HOTEL: 'hotel',
    CAR: 'car',
    TRAIN: 'train',
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
};

export const FILE_TYPES = {
    VISA: 'visa',
    TRAVEL_OPTIONS: 'travel_options',
    RECEIPTS: 'receipts',
};

export const EXTERNAL_LINKS = {
    MMT_REDIRECT_PATH: '/mmt-callback',
};
