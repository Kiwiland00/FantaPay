// Simple database reset script
console.log('🗑️ Resetting FantaPay database...');

// For localStorage (web environment)
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem('competitions_mock');
    localStorage.removeItem('admin_logs_mock');
    localStorage.removeItem('wallet_balance_650f1f1f1f1f1f1f1f1f1f1f');
    localStorage.removeItem('transactions_650f1f1f1f1f1f1f1f1f1f1f');
    
    // Remove all payment records
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('payments_')) {
        localStorage.removeItem(key);
      }
    }
    
    console.log('✅ Database reset complete - all data cleared');
  } catch (error) {
    console.log('❌ Reset failed:', error);
  }
} else {
  console.log('⚠️ localStorage not available - reset via app storage');
}