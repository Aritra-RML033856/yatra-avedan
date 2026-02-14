import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Button, ButtonProps, Box, BoxProps, Paper } from '@mui/material';

// ----------------------------------------------------------------------

export const varHover = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

export const varFadeInUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 20, opacity: 0 },
};

// ----------------------------------------------------------------------

type AnimatedButtonProps = ButtonProps & HTMLMotionProps<"button">;

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>((props, ref) => {
  return (
    <Button
      component={motion.button}
      whileHover="hover"
      whileTap="tap"
      variants={varHover}
      ref={ref}
      {...props}
    />
  );
});

// ----------------------------------------------------------------------

type PageTransitionProps = BoxProps & HTMLMotionProps<"div">;

export const PageTransition = ({ children, ...other }: PageTransitionProps) => {
  return (
    <Box
      component={motion.div}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={varFadeInUp}
      transition={{ duration: 0.4, ease: "easeOut" }}
      {...other}
    >
      {children}
    </Box>
  );
};

// ----------------------------------------------------------------------

type StaggerContainerProps = BoxProps & HTMLMotionProps<"div">;

export const StaggerContainer = ({ children, ...other }: StaggerContainerProps) => {
  return (
    <Box
      component={motion.div}
      initial="initial"
      animate="animate"
      variants={{
        animate: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      {...other}
    >
      {children}
    </Box>
  );
};

// ----------------------------------------------------------------------

export const MotionPaper = motion(Paper);
export const MotionBox = motion(Box);
