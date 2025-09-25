import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Customer API endpoints
export const customerAPI = {
  // Get all customers with stats
  getCustomers: () => {
    return api.get('/customers');
  },

  // Get customer by phone number
  getCustomerByPhone: (phoneNumber) => {
    return api.get(`/customers/phone/${phoneNumber}`);
  },

  // Get customer messages
  getCustomerMessages: (phoneNumber, limit = 50, offset = 0, order = 'DESC') => {
    return api.get(`/customers/${phoneNumber}/messages`, { 
      params: { limit, offset, order }
    });
  },

  // Send message to customer
  sendMessageToCustomer: (phoneNumber, message, agentId = 1) => {
    return api.post(`/customers/${phoneNumber}/message`, { 
      message, 
      agent_id: agentId 
    });
  },

  // Get tickets by customer phone
  getTicketsByCustomer: (phoneNumber) => {
    return api.get(`/tickets/customer/${phoneNumber}`);
  },
};

// Ticket API endpoints
export const ticketAPI = {
  // Get all tickets
  getTickets: (page = 1, limit = 20, status = null) => {
    const params = { page, limit };
    if (status) params.status = status;
    return api.get('/tickets', { params });
  },

  // Get customers (alias for backward compatibility)
  getCustomers: () => {
    return customerAPI.getCustomers();
  },

  // Get ticket by ID
  getTicket: (id) => {
    return api.get(`/tickets/${id}`);
  },

  // Get tickets by customer phone
  getTicketsByCustomer: (phoneNumber) => {
    return api.get(`/tickets/customer/${phoneNumber}`);
  },

  // Create new ticket
  createTicket: (ticketData) => {
    return api.post('/tickets', ticketData);
  },

  // Update ticket status
  updateTicketStatus: (id, status, agentId = null) => {
    return api.patch(`/tickets/${id}/status`, { status, agent_id: agentId });
  },

  // Assign ticket to agent
  assignTicket: (id, agentId) => {
    return api.patch(`/tickets/${id}/assign`, { agent_id: agentId });
  },

  // Send agent reply
  sendReply: (id, agentId, message) => {
    return api.post(`/tickets/${id}/reply`, { agent_id: agentId, message });
  },

  // Get ticket messages
  getTicketMessages: (id, limit = 50, offset = 0) => {
    return api.get(`/tickets/${id}/messages`, { 
      params: { limit, offset } 
    });
  },

  // Close ticket
  closeTicket: (id) => {
    return api.patch(`/tickets/${id}/close`);
  },

  // Check escalations
  checkEscalations: () => {
    return api.get('/tickets/escalations/check');
  },
};

// Webhook API endpoints
export const webhookAPI = {
  // Send test message
  sendTestMessage: (phoneNumber, message) => {
    return api.post('/webhook/test-message', { phoneNumber, message });
  },

  // Get webhook logs
  getWebhookLogs: (page = 1, limit = 20) => {
    return api.get('/webhook/webhook-logs', { 
      params: { page, limit } 
    });
  },

  // Health check
  healthCheck: () => {
    return api.get('/webhook/health');
  },
};

// Utility functions
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString();
};

export const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString();
};

export const getStatusColor = (status) => {
  const colors = {
    'open': '#f59e0b',
    'in_progress': '#3b82f6',
    'pending_customer': '#6b7280',
    'closed': '#10b981'
  };
  return colors[status] || '#6b7280';
};

export const getPriorityColor = (priority) => {
  const colors = {
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'urgent': '#1f2937'
  };
  return colors[priority] || '#6b7280';
};

export default api;
