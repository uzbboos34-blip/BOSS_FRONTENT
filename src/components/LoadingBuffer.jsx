import * as React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

export default function LoadingBuffer({ label = "Yuklanmoqda..." }) {
  const [progress, setProgress] = React.useState(0);
  const [buffer, setBuffer] = React.useState(10);

  const progressRef = React.useRef(() => {});
  
  React.useEffect(() => {
    progressRef.current = () => {
      if (progress === 100) {
        setProgress(0);
        setBuffer(10);
      } else {
        const diff = Math.random() * 10;
        const diff2 = Math.random() * 10;
        setProgress(prev => Math.min(prev + diff, 100));
        setBuffer(prev => Math.min(prev + diff + diff2, 100));
      }
    };
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      progressRef.current();
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mb: 0.5, fontWeight: 600 }}>
        {label}
      </Typography>
      <LinearProgress
        variant="buffer"
        value={progress}
        valueBuffer={buffer}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: '#e5e7eb',
          '& .MuiLinearProgress-bar': {
            backgroundColor: '#10b981',
          },
          '& .MuiLinearProgress-dashed': {
             animation: 'none',
             backgroundImage: 'none',
             backgroundColor: '#d1fae5'
          }
        }}
      />
    </Box>
  );
}
