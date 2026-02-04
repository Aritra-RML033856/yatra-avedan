import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  // Divider,
  Paper,
  Chip,
  Button,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  ContactMail as ContactIcon,
  FlightTakeoff as FlightIcon,
  Analytics as AnalyticsIcon,
  Mail as MailIcon,
  Person as PersonIcon,
  // Phone as PhoneIcon,
  // LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  Speed as SpeedIcon,
  Policy as PolicyIcon,
  GetApp as GetAppIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledHero = styled(Box)(({ theme }) => ({
  background: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/world-map.png')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  color: 'white',
  padding: theme.spacing(8, 0),
  marginBottom: theme.spacing(6),
  borderRadius: theme.spacing(3),
  marginTop: theme.spacing(2),
  position: 'relative',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 35px rgba(0,0,0,0.15)',
  },
}));

const StyledTeamCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.spacing(3),
  background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
  border: '2px solid #e3f2fd',
}));

const ContactCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  border: '1px solid #90caf9',
  marginBottom: theme.spacing(3),
}));

const About: React.FC = () => {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Section */}
      <StyledHero>
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700 }}
            >
               यात्रा Avedan
            </Typography>
            <Typography
              variant="h6"
              sx={{ opacity: 0.9, fontWeight: 400, maxWidth: 700, mx: 'auto', lineHeight: 1.4 }}
            >
               Streamlined Requests. Swift Approvals. 
              {/* यात्रा Avedan is a purpose-built corporate travel management platform that streamlines request submission, approvals, booking, and reconciliation. Designed to save time, enforce travel policy, and provide clear audit trails for every journey. */}
            </Typography>
          </Box>
        </Container>
      </StyledHero>

      <Box sx={{ mb: 6 }}>
        {/* Vision Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <InfoIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Our Vision
          </Typography>
          <StyledCard sx={{ maxWidth: 'lg', mx: 'auto' }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}> {/* color: '#1976d2',  */}
                To create a seamless, intelligent, and fully automated travel ecosystem that empowers employees and enables data-driven travel decisions across the organization.
              </Typography>
            </CardContent>
          </StyledCard>
        </Box>

        {/* Mission Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <BusinessIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Our Mission
          </Typography>
          <StyledCard sx={{ maxWidth: 'lg', mx: 'auto' }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Streamline the end-to-end travel lifecycle — from request through approval to final receipts — by providing a secure, easy-to-use platform that reduces manual work and improves compliance.
              </Typography>
            </CardContent>
          </StyledCard>
        </Box>

        {/* Value Proposition Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <CheckCircleIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Value Proposition
          </Typography>
          <StyledCard sx={{ maxWidth: 'lg', mx: 'auto' }}>
            <CardContent sx={{ p: 4 }}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <SpeedIcon sx={{ color: '#4caf50' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Faster approvals with clear audit trail"
                    secondary="Reduce approval times and maintain transparency with automated workflows"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PolicyIcon sx={{ color: '#ff9800' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Policy-first bookings and automated notifications"
                    secondary="Ensure compliance with company travel policies and automated communication"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <GetAppIcon sx={{ color: '#2196f3' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Centralized receipts & downloadable booking records"
                    secondary="Easy access to all travel documentation and receipts in one place"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AssessmentIcon sx={{ color: '#9c27b0' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Actionable analytics for travel cost control"
                    secondary="Data-driven insights to optimize travel spend and budget allocation"
                  />
                </ListItem>
              </List>
            </CardContent>
          </StyledCard>
        </Box>

        {/* What यात्रा Avedan Provides */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <SecurityIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            What यात्रा Avedan Provides
          </Typography>
          <StyledCard sx={{ maxWidth: 'lg', mx: 'auto' }}>
            <CardContent sx={{ p: 4 }}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: '#4caf50' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Smart Approvals: Reporting Manager → Travel admin flow with send-back & edit options"
                    secondary="Intelligent approval workflows with hierarchical routing and edit capabilities"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <FlightIcon sx={{ color: '#ff9800' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Documented Booking: Upload travel options and final tickets with receipts for audit"
                    secondary="Complete documentation of travel arrangements with receipt management"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AnalyticsIcon sx={{ color: '#2196f3' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Analytics: KPI cards and interactive charts for travel trends and spend"
                    secondary="Comprehensive analytics dashboards with spend tracking and trend analysis"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon sx={{ color: '#9c27b0' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Role-based Access: User, Reporting Manager, Travel Admin and Super Admin roles"
                    secondary="Secure, role-based access control with appropriate permissions for each user type"
                  />
                </ListItem>
              </List>
            </CardContent>
          </StyledCard>
        </Box>

        {/* FAQ Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <HelpIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Frequently Asked Questions
          </Typography>

          <Box sx={{ maxWidth: 'lg', mx: 'auto' }}>
            <Accordion sx={{ mb: 2, borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  How long does approval take?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  Approvals depend on your reporting manager's availability. Most requests are processed within 24–48 business hours. Travel admin actions depend on booking availability.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Can I edit a request after submission?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  Yes — if your reporting manager sends the request back for edits, you can update the details and resubmit.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Where can I download my ticket/receipt?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography gutterBottom>
                  After booking, travel admin uploads the final receipt. You can view/download from the trip details page or via the confirmation email.
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 2, color: '#1976d2' }}>
                  💡 Tip: Include your Trip Reference No (e.g., TRIP1764763042408DUY5CU) in any support email for faster assistance.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>

        {/* Features/Services */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <FlightIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Our Services
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            <Box sx={{ flex: '1 1 350px', maxWidth: '400px' }}>
              <StyledCard>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2, width: 60, height: 60 }}>
                    <FlightIcon sx={{ fontSize: 30 }} />
                  </Avatar>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Travel Request Management
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Submit, approve, and manage business travel requests with multi-level approval workflows.
                    Support for domestic and international travel with comprehensive request tracking.
                  </Typography>
                </CardContent>
              </StyledCard>
            </Box>

            <Box sx={{ flex: '1 1 350px', maxWidth: '400px' }}>
              <StyledCard>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: '#ff9800', mx: 'auto', mb: 2, width: 60, height: 60 }}>
                    <AnalyticsIcon sx={{ fontSize: 30 }} />
                  </Avatar>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Advanced Analytics
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Comprehensive analytics and reporting on travel spend patterns, department-wise expenditure,
                    and travel trends to help optimize business travel costs and policies.
                  </Typography>
                </CardContent>
              </StyledCard>
            </Box>

            <Box sx={{ flex: '1 1 350px', maxWidth: '400px' }}>
              <StyledCard>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: '#9c27b0', mx: 'auto', mb: 2, width: 60, height: 60 }}>
                    <PeopleIcon sx={{ fontSize: 30 }} />
                  </Avatar>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Multi-Level Approvals
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Hierarchical approval system with User → Reporting Manager workflow,
                    ensuring proper authorization and compliance with company travel policies.
                  </Typography>
                </CardContent>
              </StyledCard>
            </Box>
          </Box>
        </Box>

        {/* Team Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <PeopleIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Our Team
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            <Box sx={{ flex: '1 1 400px', maxWidth: '500px' }}>
              <StyledTeamCard>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      bgcolor: '#1976d2',
                      mx: 'auto',
                      mb: 3,
                      width: 100,
                      height: 100,
                      fontSize: '2.5rem'
                    }}
                  >
                    ZH
                  </Avatar>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Zubin Harmanues
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#1976d2', fontWeight: 500 }}>
                    Travel Administrator
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Expert in travel operations and logistics management across Rashmi Group's diverse business units.
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                    <Chip label="Travel Management" size="small" color="primary" variant="outlined" />
                    <Chip label="Operations" size="small" color="secondary" variant="outlined" />
                  </Stack>
                </CardContent>
              </StyledTeamCard>
            </Box>

            <Box sx={{ flex: '1 1 400px', maxWidth: '500px' }}>
              <StyledTeamCard>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      bgcolor: '#4caf50',
                      mx: 'auto',
                      mb: 3,
                      width: 100,
                      height: 100,
                      fontSize: '2.5rem'
                    }}
                  >
                    AB
                  </Avatar>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Aritra Bag
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#4caf50', fontWeight: 500 }}>
                    Software Developer
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Full-stack developer specializing in enterprise applications and digital transformation solutions.
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                    <Chip label="React" size="small" color="success" variant="outlined" />
                    <Chip label="Node.js" size="small" color="info" variant="outlined" />
                    <Chip label="PostgreSQL" size="small" color="warning" variant="outlined" />
                  </Stack>
                </CardContent>
              </StyledTeamCard>
            </Box>
          </Box>
        </Box>

        {/* Contact & Support Information */}
        <Box id="contact-support">
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            <ContactIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Contact & Support
          </Typography>

          <Box sx={{ maxWidth: 'lg', mx: 'auto', mb: 3 }}>
            <Paper sx={{
              p: 3,
              bgcolor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: 2,
              mb: 3
            }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#856404' }}>
                Please include your Trip Reference No (e.g., TRIP1764763042408DUY5CU) in any support email.
              </Typography>
            </Paper>

            {/* Travel Issues */}
            <ContactCard elevation={3}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                <Avatar sx={{ bgcolor: '#ff9800', mt: 1 }}>
                  <FlightIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#ff9800' }}>
                    Travel Admin
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ color: '#ff9800' }} />
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                      Zubin Harmanues
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <MailIcon sx={{ color: '#ff9800' }} />
                    <Typography variant="body1">
                      <Button
                        variant="text"
                        sx={{ p: 0, textTransform: 'none', fontSize: '1rem', fontWeight: 500 }}
                        href="mailto:Zubin.Harmanues@rashmigroup.com"
                      >
                        Zubin.Harmanues@rashmigroup.com
                      </Button>
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label="Travel Admin" sx={{ mr: 1 }} />
                  <Chip label="Travel Operations" variant="outlined" />
                  </Stack>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Support hours: Mon–Sat, 09:00–18:00 IST. Emergency issues outside hours escalate via email with high priority.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </ContactCard>

            {/* Technical Issues */}
            <ContactCard elevation={3}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                <Avatar sx={{ bgcolor: '#4caf50', mt: 1 }}>
                  <AnalyticsIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#4caf50' }}>
                    Software Developer
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ color: '#4caf50' }} />
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                      Aritra Bag
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <MailIcon sx={{ color: '#4caf50' }} />
                    <Typography variant="body1">
                      <Button
                        variant="text"
                        sx={{ p: 0, textTransform: 'none', fontSize: '1rem', fontWeight: 500 }}
                        href="mailto:aritra.bag@rashmigroup.com"
                      >
                        aritra.bag@rashmigroup.com
                      </Button>
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label="Developer" variant="outlined" />
                    <Chip label="Business Analyst" variant="outlined" />
                  </Stack>
                  {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Support hours: Mon–Sat, 09:00–18:00 IST. Emergency issues outside hours escalate via email with high priority.
                    </Typography>
                  </Box> */}
                </Box>
              </Box>
            </ContactCard>

            {/* Company Footer */}
            <Box sx={{ textAlign: 'center', mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                यात्रा Avedan
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Excellence in Travel Operations & Management
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                © 2025 यात्रा Avedan — All rights reserved.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default About;
