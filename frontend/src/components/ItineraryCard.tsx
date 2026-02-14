import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Collapse,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  FlightTakeoff,
  Hotel,
  DirectionsCar,
  Train,
  Delete,
  ExpandMore,
} from '@mui/icons-material';
import { ITINERARY_TYPES } from '../constants';
import { MotionBox, varFadeInUp } from './AnimatedComponents';

// ----------------------------------------------------------------------

interface ItineraryCardProps {
  item: {
    id: string;
    type: string;
    details: any;
  };
  index: number;
  onRemove: () => void;
  children: React.ReactNode;
  isValid?: boolean;
}

const getTypeConfig = (type: string) => {
  switch (type) {
    case ITINERARY_TYPES.FLIGHT: return { icon: <FlightTakeoff />, color: 'primary', label: 'Flight' };
    case ITINERARY_TYPES.HOTEL: return { icon: <Hotel />, color: 'secondary', label: 'Hotel' };
    case ITINERARY_TYPES.CAR: return { icon: <DirectionsCar />, color: 'warning', label: 'Car Rental' };
    case ITINERARY_TYPES.TRAIN: return { icon: <Train />, color: 'info', label: 'Train' };
    default: return { icon: <FlightTakeoff />, color: 'primary', label: 'Travel' };
  }
};

const ItineraryCard: React.FC<ItineraryCardProps> = ({ item, index, onRemove, children, isValid = true }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const { icon, color, label } = getTypeConfig(item.type);

  // Dynamic Color helpers
  const mainColor = theme.palette[color as 'primary' | 'secondary' | 'warning' | 'info'].main;
  const lightColor = alpha(mainColor, 0.08);
  const borderColor = alpha(mainColor, 0.3);

  const getSummary = () => {
    const d = item.details;
    if (item.type === 'flight') {
        const from = d.departFrom?.code || d.departFrom?.name || (typeof d.departFrom === 'string' ? d.departFrom : '') || '';
        const to = d.arriveAt?.code || d.arriveAt?.name || (typeof d.arriveAt === 'string' ? d.arriveAt : '') || '';
        return from && to ? `${from} ✈️ ${to}` : 'New Flight';
    }
    if (item.type === 'hotel') {
        const loc = d.location?.cityName || (typeof d.location === 'string' ? d.location : '') || '';
        return loc ? `${loc}` : 'New Hotel Stay';
    }
    if (item.type === 'car') {
        const loc = d.pickupLocation?.cityName || (typeof d.pickupLocation === 'string' ? d.pickupLocation : '') || '';
        return loc ? `${loc}` : 'New Car Rental';
    }
    if (item.type === 'train') {
        const from = d.departFrom?.stnCode || d.departFrom?.stnName || (typeof d.departFrom === 'string' ? d.departFrom : '') || '';
        const to = d.arriveAt?.stnCode || d.arriveAt?.stnName || (typeof d.arriveAt === 'string' ? d.arriveAt : '') || '';
        return from && to ? `${from} 🚆 ${to}` : 'New Train Journey';
    }
    return '';
  };

  return (
    <MotionBox variants={varFadeInUp} layout>
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          position: 'relative',
          overflow: 'visible',
          borderColor: expanded ? borderColor : 'divider',
          borderLeftWidth: 6,
          borderLeftColor: mainColor,
          transition: 'all 0.3s ease',
          boxShadow: expanded ? theme.shadows[4] : theme.shadows[1],
          '&:hover': {
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            bgcolor: expanded ? lightColor : 'background.paper',
            borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'background.paper',
                p: 1,
                borderRadius: '50%',
                color: mainColor,
                display: 'flex',
                boxShadow: 1,
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                {label} #{index + 1}
                {!expanded && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'normal' }}>
                         — {getSummary()}
                    </Typography>
                )}
              </Typography>
              {expanded && (
                  <Typography variant="caption" color="text.secondary">
                    Click to collapse
                  </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isValid && <Chip label="Incomplete" color="error" size="small" variant="outlined" />}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              color="error"
              sx={{ opacity: 0.7, '&:hover': { opacity: 1, bgcolor: alpha(theme.palette.error.main, 0.1) } }}
            >
               <Delete />
            </IconButton>
            <IconButton size="small" sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>
              <ExpandMore />
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent sx={{ p: 3 }}>
            {children}
          </CardContent>
        </Collapse>
      </Card>
    </MotionBox>
  );
};

export default ItineraryCard;
