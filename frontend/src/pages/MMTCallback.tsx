import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, CircularProgress, Box, Alert, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';

const MMTCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const processCallback = async () => {
            const tripId = searchParams.get('trip_id');
            const option = searchParams.get('option');
            const cost = searchParams.get('cost');
            const mmtPayloadStr = searchParams.get('mmt_payload');

            let mmtPayload = null;
            if (mmtPayloadStr) {
                try {
                    mmtPayload = JSON.parse(mmtPayloadStr);
                } catch (e) {
                    console.error("Failed to parse MMT Payload", e);
                }
            }

            if (!tripId || !option) {
                setStatus('error');
                setErrorMsg('Invalid callback parameters. Missing trip_id or option.');
                return;
            }

            try {
                // Call Yatra Backend to update the trip
                await axios.post(`${API_BASE_URL}/api/trips/${tripId}/select`, {
                    option: option,
                    cost: cost ? parseInt(cost, 10) : undefined,
                    mmt_payload: mmtPayload
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setStatus('success');
                // Redirect after short delay
                setTimeout(() => {
                    navigate('/my-trips');
                }, 2000);

            } catch (err: any) {
                console.error('MMT Callback Error:', err);
                setStatus('error');
                setErrorMsg(err.response?.data?.error || 'Failed to process MMT selection.');
            }
        };

        if (token) {
            processCallback();
        }
    }, [searchParams, token, navigate]);

    return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
            {status === 'processing' && (
                <Box>
                    <CircularProgress size={60} />
                    <Typography variant="h5" sx={{ mt: 2 }}>
                        Processing MMT Selection...
                    </Typography>
                    <Typography color="text.secondary">
                        Please wait while we sync your booking details.
                    </Typography>
                </Box>
            )}

            {status === 'success' && (
                <Alert severity="success" sx={{ justifyContent: 'center' }}>
                    <Typography variant="h6">Success!</Typography>
                    Your travel option has been successfully recorded. Redirecting to My Trips...
                </Alert>
            )}

            {status === 'error' && (
                <Box>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {errorMsg}
                    </Alert>
                    <Button variant="contained" onClick={() => navigate('/my-trips')}>
                        Return to My Trips
                    </Button>
                </Box>
            )}
        </Container>
    );
};

export default MMTCallback;
