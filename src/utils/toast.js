class ToastBus {
  listeners = [];

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  show(message, severity = 'info') {
    this.listeners.forEach(l => {
      try {
        l(message, severity);
      } catch (e) {
        console.error('Failed to notify toast listener:', e);
      }
    });
  }
}

export const toastBus = new ToastBus();

// Override window.alert globally in the browser environment
if (typeof window !== 'undefined') {
  const originalAlert = window.alert; // Keep a backup just in case
  
  window.alert = (message) => {
    console.log('[GlobalAlert Intercepted]:', message);
    
    // Auto-detect message severity (error vs success vs info)
    let severity = 'success';
    const msgLower = String(message || '').toLowerCase();
    
    if (
      msgLower.includes('ошибка') ||
      msgLower.includes('xato') ||
      msgLower.includes('error') ||
      msgLower.includes('не удалось') ||
      msgLower.includes('пуст') ||
      msgLower.includes('выберите') ||
      msgLower.includes('заполните') ||
      msgLower.includes('отсутствует') ||
      msgLower.includes('failed') ||
      msgLower.includes('not found') ||
      msgLower.includes('taqiqlangan')
    ) {
      severity = 'error';
    } else if (
      msgLower.includes('предупреждение') || 
      msgLower.includes('ogohlantirish') || 
      msgLower.includes('warning')
    ) {
      severity = 'warning';
    } else if (
      msgLower.includes('информация') || 
      msgLower.includes('ma\'lumot') || 
      msgLower.includes('info')
    ) {
      severity = 'info';
    }
    
    toastBus.show(message, severity);
  };
}
