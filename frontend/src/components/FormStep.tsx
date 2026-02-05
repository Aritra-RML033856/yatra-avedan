import React from 'react';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Delete } from '@mui/icons-material';

// ----------------------------------------------------------------------

interface FormStepProps {
  steps: string[];
  activeStep: number;
  onBack: () => void;
  onClear?: () => void;
  onNext: () => void;
  isLastStep: boolean;
  isValid: boolean;
  isSubmitting?: boolean;
  hideButtons?: boolean;
  children: React.ReactNode;
}

const FormStep: React.FC<FormStepProps> = ({
  steps,
  activeStep,
  onBack,
  onClear,
  onNext,
  isLastStep,
  isValid,
  isSubmitting = false,
  hideButtons = false,
  children
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => {
             const isCompleted = index < activeStep;
             return (
                <Step key={label} completed={isCompleted}>
                  <StepLabel 
                    StepIconComponent={(props) => (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: props.active ? 'primary.main' : isCompleted ? 'success.main' : 'grey.300',
                            color: 'common.white',
                            fontWeight: 'bold',
                            zIndex: 1,
                          }}
                        >
                            {isCompleted ? <Check fontSize="small" /> : index + 1}
                        </Box>
                    )}
                  >
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontWeight: activeStep === index ? 'bold' : 'normal',
                            color: activeStep === index ? 'primary.main' : 'text.secondary'
                        }}
                    >
                        {label}
                    </Typography>
                  </StepLabel>
                </Step>
             );
          })}
        </Stepper>
      </Paper>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>



      {!hideButtons && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            disabled={activeStep === 0}
            onClick={onBack}
            sx={{ mr: 1 }}
            size="large"
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {onClear && (
              <Button
                  variant="outlined"
                  color="error"
                  onClick={onClear}
                  startIcon={<Delete />}
                  sx={{ mr: 2 }}
              >
                  Clear All
              </Button>
          )}
          <Button
            variant="contained"
            onClick={onNext}
            disabled={!isValid || isSubmitting}
            size="large"
            sx={{ px: 4 }}
          >
            {isLastStep ? (isSubmitting ? 'Submitting...' : 'Submit Request') : 'Next Step'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FormStep;
