// Debug utility for Socket.IO issues
export const debugSocket = {
  logConnectionStatus: (socketService) => {
    const status = socketService.getConnectionStatus();
    console.log('🔍 Socket Debug Info:', {
      connected: status.connected,
      userType: status.userType,
      userId: status.userId,
      phoneNumber: status.phoneNumber,
      currentTicket: status.currentTicket,
      formState: status.formState
    });
  },

  logMessage: (message, context = '') => {
    console.log(`📨 ${context} Message Debug:`, {
      id: message?.id,
      type: message?.type || message?.sender_type,
      text: message?.text || message?.message_text,
      timestamp: message?.timestamp || message?.created_at,
      fullMessage: message
    });
  },

  logError: (error, context = '') => {
    console.error(`❌ ${context} Error Debug:`, {
      message: error?.message,
      stack: error?.stack,
      fullError: error
    });
  },

  testSocketConnection: (socketService) => {
    console.log('🧪 Testing Socket Connection...');
    
    if (!socketService.socket) {
      console.error('❌ Socket not initialized');
      return false;
    }

    if (!socketService.isConnected) {
      console.error('❌ Socket not connected');
      return false;
    }

    if (!socketService.userType) {
      console.error('❌ User type not set');
      return false;
    }

    console.log('✅ Socket connection test passed');
    return true;
  }
};

export default debugSocket;
