// Chat Interface Debugger
export const chatDebugger = {
  logComponentState: (componentName, state) => {
    console.log(`🔍 ${componentName} State:`, {
      timestamp: new Date().toISOString(),
      ...state
    });
  },

  logMessageFlow: (action, data) => {
    console.log(`📨 Message Flow - ${action}:`, {
      timestamp: new Date().toISOString(),
      data: data
    });
  },

  logSocketEvent: (event, data) => {
    console.log(`🔌 Socket Event - ${event}:`, {
      timestamp: new Date().toISOString(),
      data: data
    });
  },

  logError: (context, error) => {
    console.error(`❌ ${context} Error:`, {
      timestamp: new Date().toISOString(),
      error: error,
      stack: error?.stack
    });
  },

  logRender: (componentName, props) => {
    console.log(`🎨 ${componentName} Render:`, {
      timestamp: new Date().toISOString(),
      props: props
    });
  },

  // Test function to simulate message sending
  testMessageSend: (socketService, ticketId, message) => {
    console.log('🧪 Testing message send...');
    
    try {
      if (!socketService.socket) {
        throw new Error('Socket not initialized');
      }
      
      if (!socketService.isConnected) {
        throw new Error('Socket not connected');
      }
      
      if (!socketService.userType) {
        throw new Error('User type not set');
      }
      
      console.log('✅ Pre-send checks passed');
      socketService.sendAgentMessage(ticketId, message);
      console.log('✅ Message send attempted');
      
    } catch (error) {
      console.error('❌ Message send test failed:', error);
    }
  }
};

export default chatDebugger;
