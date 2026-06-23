import React, { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { toastBus } from '../utils/toast';

export default function GlobalToast() {
  const [state, setState] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    // Subscribe to toast event bus
    const unsubscribe = toastBus.subscribe((message, severity) => {
      setState({ open: true, message, severity });
    });
    return unsubscribe;
  }, []);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setState(prev => ({ ...prev, open: false }));
  };

  return (
    <Snackbar
      open={state.open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }} // right-side top placement
      sx={{ 
        zIndex: 9999,
        top: { xs: '12px', sm: '24px' },
        right: { xs: '12px', sm: '24px' },
        maxWidth: { xs: '90vw', sm: '380px' }
      }}
    >
      <Alert 
        onClose={handleClose} 
        severity={state.severity} 
        variant="filled"
        sx={{ 
          width: '100%', 
          borderRadius: '16px', 
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          fontSize: '0.85rem',
          fontWeight: 600,
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        {state.message}
      </Alert>
    </Snackbar>
  );
}
