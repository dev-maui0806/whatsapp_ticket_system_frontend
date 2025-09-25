import socketService from './socket';

class SocketAPI {
  constructor() {
    this.isConnected = false;
    this.pendingRequests = new Map();
    this.requestId = 0;
    
    // Set up connection status listener
    socketService.on('connectionStatus', (data) => {
      this.isConnected = data.connected;
    });
  }

  // Generate unique request ID
  generateRequestId() {
    return ++this.requestId;
  }

  // Wait for response with timeout
  waitForResponse(requestId, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timer });
    });
  }

  // Handle response
  handleResponse(requestId, data) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      clearTimeout(request.timer);
      this.pendingRequests.delete(requestId);
      request.resolve(data);
    }
  }

  // Handle error response
  handleError(requestId, error) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      clearTimeout(request.timer);
      this.pendingRequests.delete(requestId);
      request.reject(new Error(error));
    }
  }

  // Send request via socket
  async sendRequest(event, data, responseEvent = null) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }

    const requestId = this.generateRequestId();
    const requestData = { ...data, requestId };

    // Set up response listener if response event is specified
    let responsePromise = null;
    if (responseEvent) {
      responsePromise = this.waitForResponse(requestId);
      
      // Set up one-time listener for response
      const responseHandler = (responseData) => {
        if (responseData.requestId === requestId) {
          socketService.off(responseEvent, responseHandler);
          this.handleResponse(requestId, responseData);
        }
      };
      
      socketService.on(responseEvent, responseHandler);
    }

    // Send request
    socketService.socket.emit(event, requestData);

    // Return response promise or immediate success
    return responsePromise || Promise.resolve({ success: true });
  }

  // Ticket operations
  async getTickets(page = 1, limit = 20, status = null) {
    return this.sendRequest('getTickets', { page, limit, status }, 'ticketsResponse');
  }

  async getTicket(id) {
    return this.sendRequest('getTicket', { id }, 'ticketResponse');
  }

  async createTicket(ticketData) {
    return this.sendRequest('createTicket', ticketData, 'ticketCreated');
  }

  async updateTicketStatus(id, status, agentId = null) {
    return this.sendRequest('updateTicketStatus', { id, status, agentId }, 'ticketUpdated');
  }

  async assignTicket(id, agentId) {
    return this.sendRequest('assignTicket', { id, agentId }, 'ticketAssigned');
  }

  async closeTicket(id) {
    return this.sendRequest('closeTicket', { id }, 'ticketClosed');
  }

  async getTicketMessages(id, limit = 50, offset = 0) {
    return this.sendRequest('getTicketMessages', { id, limit, offset }, 'ticketMessagesResponse');
  }

  // Message operations
  async sendMessage(ticketId, messageText, agentId = 1) {
    return this.sendRequest('sendMessage', { ticketId, messageText, agentId }, 'messageSent');
  }

  // Agent operations
  async connectAsAgent(agentId, agentName = null) {
    socketService.connectAsAgent(agentId, agentName);
    return Promise.resolve({ success: true });
  }

  // Customer operations
  async connectAsCustomer(phoneNumber, customerName = null) {
    socketService.connectAsCustomer(phoneNumber, customerName);
    return Promise.resolve({ success: true });
  }

  // Real-time event listeners
  onNewTicket(callback) {
    socketService.on('newTicketCreated', callback);
  }

  onNewMessage(callback) {
    socketService.on('newCustomerMessage', callback);
  }

  onTicketUpdate(callback) {
    socketService.on('ticketUpdated', callback);
  }

  onAgentAction(callback) {
    socketService.on('agentActionCompleted', callback);
  }

  // Remove event listeners
  offNewTicket(callback) {
    socketService.off('newTicketCreated', callback);
  }

  offNewMessage(callback) {
    socketService.off('newCustomerMessage', callback);
  }

  offTicketUpdate(callback) {
    socketService.off('ticketUpdated', callback);
  }

  offAgentAction(callback) {
    socketService.off('agentActionCompleted', callback);
  }

  // Connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketStatus: socketService.getConnectionStatus()
    };
  }

  // Connect to socket
  connect() {
    socketService.connect();
  }

  // Disconnect from socket
  disconnect() {
    socketService.disconnect();
  }
}

// Create singleton instance
const socketAPI = new SocketAPI();

export default socketAPI;
