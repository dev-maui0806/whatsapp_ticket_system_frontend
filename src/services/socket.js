import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.userType = null; // 'customer' or 'agent'
    this.userId = null;
    this.phoneNumber = null;
    this.currentTicket = null;
    this.formState = {
      currentStep: 'initial',
      selectedCategory: null,
      formData: {}
    };
  }

  connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected, skipping duplicate connection');
      return;
    }

    // Clean up existing connection if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
      this.emit('connectionStatus', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.isConnected = false;
      this.emit('connectionStatus', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.emit('connectionStatus', { connected: false, error });
    });

    // Handle connection status
    this.socket.on('customerConnected', (data) => {
      console.log('Customer connected:', data);
      this.userType = 'customer';
      this.userId = data.customer?.id;
      this.currentTicket = data.existingTicket;
      this.emit('customerConnected', data);
    });

    this.socket.on('agentConnected', (data) => {
      console.log('Agent connected:', data);
      this.userType = 'agent';
      this.userId = data.agentId;
      this.emit('agentConnected', data);
    });

    this.socket.on('agentJoined', (data) => {
      console.log('Agent joined room:', data);
      this.emit('agentJoined', data);
    });

    this.socket.on('agentLeft', (data) => {
      console.log('Agent left room:', data);
      this.emit('agentLeft', data);
    });

    // Handle interactive messages
    this.socket.on('interactiveMessage', (data) => {
      console.log('Interactive message received:', data);
      this.emit('interactiveMessage', data);
    });

    // Handle form steps
    this.socket.on('formStep', (data) => {
      console.log('Form step received:', data);
      this.formState.currentStep = data.step;
      this.emit('formStep', data);
    });

    // Handle ticket updates
    this.socket.on('ticketUpdated', (data) => {
      console.log('Ticket updated:', data);
      this.emit('ticketUpdated', data);
    });

    // Handle new messages
    this.socket.on('newMessage', (data) => {
      console.log('New message received:', data);
      this.emit('newMessage', data);
    });

    this.socket.on('newCustomerMessage', (data) => {
      console.log('New customer message:', data);
      this.emit('newCustomerMessage', data);
    });

    this.socket.on('newAgentMessage', (data) => {
      console.log('New agent message:', data);
      this.emit('newAgentMessage', data);
    });

    // Customer created/updated events (dashboard stats + sidebar cards)
    this.socket.on('newCustomer', (data) => {
      console.log('New customer:', data);
      this.emit('newCustomer', data);
    });

    this.socket.on('customerUpdated', (data) => {
      console.log('Customer updated (server):', data);
      this.emit('customerUpdated', data);
    });

    // Aggregate dashboard stats updates (totals/open/closed/pending)
    this.socket.on('dashboardStatsUpdated', (data) => {
      console.log('Dashboard stats updated (server):', data);
      this.emit('dashboardStatsUpdated', data);
    });

    // Handle new tickets
    this.socket.on('newTicket', (data) => {
      console.log('New ticket created:', data);
      this.emit('newTicket', data);
    });

    this.socket.on('newTicketCreated', (data) => {
      console.log('New ticket created:', data);
      this.emit('newTicketCreated', data);
    });

    // Handle escalations
    this.socket.on('ticketEscalated', (data) => {
      console.log('Ticket escalated:', data);
      this.emit('ticketEscalated', data);
    });

    // Handle system messages
    this.socket.on('systemMessage', (data) => {
      console.log('System message:', data);
      this.emit('systemMessage', data);
    });

    // Handle ticket creation
    this.socket.on('ticketCreated', (data) => {
      console.log('Ticket created:', data);
      this.currentTicket = data.ticket;
      this.emit('ticketCreated', data);
    });

    // Handle agent actions
    this.socket.on('agentActionCompleted', (data) => {
      console.log('Agent action completed:', data);
      this.emit('agentActionCompleted', data);
    });

    // Handle message acknowledgment responses
    this.socket.on('messagesAcknowledged', (data) => {
      console.log('Messages acknowledged:', data);
      this.emit('messagesAcknowledged', data);
    });

    // Handle errors
    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      this.emit('error', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Customer connection
  connectAsCustomer(phoneNumber, customerName = null) {
    if (this.socket && this.isConnected) {
      this.phoneNumber = phoneNumber;
      this.socket.emit('customerConnect', { phoneNumber, customerName });
      console.log(`Connecting as customer: ${phoneNumber}`);
    }
  }

  // Agent connection
  connectAsAgent(agentId, agentName = null) {
    if (this.socket && this.isConnected) {
      try {
        console.log(`Connecting as agent: ${agentId}`);
        this.socket.emit('agentConnect', { agentId, agentName });
      } catch (error) {
        console.error('Error connecting as agent:', error);
      }
    } else {
      console.warn('Cannot connect as agent - socket not ready:', {
        socket: !!this.socket,
        connected: this.isConnected
      });
    }
  }

  // Send customer message
  sendCustomerMessage(messageText, messageType = 'text') {
    if (this.socket && this.isConnected && this.userType === 'customer') {
      this.socket.emit('customerMessage', { messageText, messageType });
      console.log(`Sending customer message: ${messageText}`);
    }
  }

  // Send agent message
  sendAgentMessage(ticketId, messageText) {
    if (this.socket && this.isConnected && this.userType === 'agent') {
      try {
        console.log(`Sending agent message to ticket ${ticketId}: ${messageText}`);
        this.socket.emit('agentMessage', { ticketId, messageText });
      } catch (error) {
        console.error('Error sending agent message:', error);
        throw error;
      }
    } else {
      console.warn('Cannot send agent message:', {
        socket: !!this.socket,
        connected: this.isConnected,
        userType: this.userType
      });
    }
  }

  // Send interactive response
  sendInteractiveResponse(buttonId, buttonTitle) {
    if (this.socket && this.isConnected) {
      this.socket.emit('interactiveResponse', { buttonId, buttonTitle });
      console.log(`Sending interactive response: ${buttonId} - ${buttonTitle}`);
    }
  }

  // Send form step completion
  sendFormStepComplete(step, stepData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('formStepComplete', { step, stepData });
      console.log(`Sending form step completion: ${step}`, stepData);
    }
  }

  // Send agent action
  sendAgentAction(action, ticketId, data = {}) {
    if (this.socket && this.isConnected && this.userType === 'agent') {
      this.socket.emit('agentAction', { action, ticketId, data });
      console.log(`Sending agent action: ${action} for ticket ${ticketId}`);
    }
  }

  // Join agent room
  joinAgent(agentId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinAgent', agentId);
      console.log(`Joined agent room: ${agentId}`);
    }
  }

  // Leave agent room
  leaveAgent(agentId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveAgent', agentId);
      console.log(`Left agent room: ${agentId}`);
    }
  }

  // Acknowledge messages for a customer
  acknowledgeMessages(phoneNumber) {
    if (this.socket && this.isConnected && this.userType === 'agent') {
      this.socket.emit('acknowledgeMessages', { phoneNumber });
      console.log(`Acknowledging messages for: ${phoneNumber}`);
    } else {
      console.warn('Cannot acknowledge messages:', {
        socket: !!this.socket,
        connected: this.isConnected,
        userType: this.userType
      });
    }
  }

  // Generic event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit event to listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Check if connected
  isConnected() {
    return this.isConnected;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socket: this.socket,
      userType: this.userType,
      userId: this.userId,
      phoneNumber: this.phoneNumber,
      currentTicket: this.currentTicket,
      formState: this.formState
    };
  }

  // Update form state
  updateFormState(step, data = {}) {
    this.formState.currentStep = step;
    this.formState.formData = { ...this.formState.formData, ...data };
  }

  // Get form state
  getFormState() {
    return this.formState;
  }

  // Reset form state
  resetFormState() {
    this.formState = {
      currentStep: 'initial',
      selectedCategory: null,
      formData: {}
    };
  }

  // Set current ticket
  setCurrentTicket(ticket) {
    this.currentTicket = ticket;
  }

  // Get current ticket
  getCurrentTicket() {
    return this.currentTicket;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
