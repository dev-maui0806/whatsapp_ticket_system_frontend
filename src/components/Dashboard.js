import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Bell,
  Zap
} from 'lucide-react';
import CustomerList from './CustomerList';
import CustomerChatInterface from './CustomerChatInterface';
import Header from './Header';
import ErrorBoundary from './ErrorBoundary';
import { ticketAPI } from '../services/api';
import socketService from '../services/socket';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0
  });

  // Initialize socket connection
  useEffect(() => {
    console.log('🔌 Dashboard: Initializing socket connection...');
    
    // Connect to socket
    socketService.connect();
    
    // Set up connection status listener
    const handleConnectionStatus = (data) => {
      if (data.connected) {
        // Wait a bit for the connection to be fully established
        setTimeout(() => {
          socketService.connectAsAgent(1, 'Admin User');
          socketService.joinAgent(1);
        }, 100);
      } else {
        console.log('❌ Dashboard: Socket disconnected');
      }
    };

    const handleAgentJoined = (data) => {
    };

    // Set up socket listeners
    const handleNewCustomer = (data) => {
      if (data && data.id) {
        setCustomers(prev => [data, ...prev]);
        updateStats();
      } else {
        console.warn('Invalid new customer data:', data);
      }
    };

    const handleCustomerUpdated = (data) => {
      if (data && data.phone_number) {
        // Update customer by phone number (for acknowledgment updates)
        setCustomers(prev => 
          prev.map(customer => 
            customer.phone_number === data.phone_number ? { ...customer, ...data } : customer
          )
        );
        
        if (selectedCustomer && selectedCustomer.phone_number === data.phone_number) {
          setSelectedCustomer(prev => ({ ...prev, ...data }));
        }
        
        updateStats();
      } else if (data && data.id) {
        // Update customer by ID (for other updates)
        setCustomers(prev => 
          prev.map(customer => 
            customer.id === data.id ? { ...customer, ...data } : customer
          )
        );
        
        if (selectedCustomer && selectedCustomer.id === data.id) {
          setSelectedCustomer(prev => ({ ...prev, ...data }));
        }
        
        updateStats();
      } else {
        console.warn('Invalid customer update data:', data);
      }
    };

    const handleNewMessage = (data) => {
      if (data && data.phone_number && selectedCustomer && selectedCustomer.phone_number === data.phone_number) {
        // Message will be handled by CustomerChatInterface component
      } else {
        console.log('Message not for current customer or invalid data:', {
          dataPhoneNumber: data?.phone_number,
          selectedCustomerPhone: selectedCustomer?.phone_number,
          data: data
        });
      }
    };

    // Auto-activate customer on first WhatsApp message
    const handleNewCustomerMessage = (data) => {
      try {
        if (!data) return;
        const incomingCustomer = data.customer;
        if (!incomingCustomer) return;
        
        // If no customer selected, or different customer, auto-activate
        if (!selectedCustomer || selectedCustomer.phone_number !== incomingCustomer.phone_number) {
          setSelectedCustomer(incomingCustomer);
          // Prepend to list if not present
          setCustomers(prev => {
            const exists = prev.some(c => c && c.phone_number === incomingCustomer.phone_number);
            return exists ? prev.map(c => (c.phone_number === incomingCustomer.phone_number ? { ...c, ...incomingCustomer } : c)) : [incomingCustomer, ...prev];
          });
          updateStats();
        }
      } catch (e) {
        console.error('Error handling newCustomerMessage (auto-activate):', e);
      }
    };

    // Handle dashboard stats updates
    const handleDashboardStatsUpdated = (data) => {
      try {
        
        if (data && data.type) {
          // Reload customers to get updated stats
          loadCustomers(false);
          // Show notification based on update type
          switch (data.type) {
            case 'ticket_created':
              console.log('🎫 New ticket created:', data.ticket);
              break;
            case 'ticket_closed':
              console.log('🔒 Ticket closed:', data.ticket);
              break;
            case 'new_message':
              console.log('💬 New message received:', data.customer);
              break;
            default:
              console.log('📈 Dashboard stats updated:', data.type);
          }
        }
      } catch (e) {
        console.error('Error handling dashboard stats update:', e);
      }
    };

    // Set up all listeners
    socketService.on('connectionStatus', handleConnectionStatus);
    socketService.on('agentJoined', handleAgentJoined);
    socketService.on('newCustomer', handleNewCustomer);
    socketService.on('customerUpdated', handleCustomerUpdated);
    socketService.on('newMessage', handleNewMessage);
    socketService.on('newCustomerMessage', handleNewCustomerMessage);
    socketService.on('dashboardStatsUpdated', handleDashboardStatsUpdated);

    return () => {
      socketService.off('connectionStatus', handleConnectionStatus);
      socketService.off('agentJoined', handleAgentJoined);
      socketService.off('newCustomer', handleNewCustomer);
      socketService.off('customerUpdated', handleCustomerUpdated);
      socketService.off('newMessage', handleNewMessage);
      socketService.off('newCustomerMessage', handleNewCustomerMessage);
      socketService.off('dashboardStatsUpdated', handleDashboardStatsUpdated);
    };
  }, [selectedCustomer]);

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (loading = true) => {
    try {
      setLoading(loading);
      setError(null);
      
      const response = await ticketAPI.getCustomers();
      if (response.data.success) {
        setCustomers(response.data.data);
        updateStats(response.data.data);
      } else {
        setError('Failed to load customers');
      }
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Error loading customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (customersData = customers) => {
    try {
      // Ensure we have valid customers data
      const dataToUse = customersData || customers || [];
      
      if (!Array.isArray(dataToUse)) {
        console.warn('updateStats: Invalid customers data, using empty array:', dataToUse);
        setStats({ total: 0, open: 0, inProgress: 0, closed: 0 });
        return;
      }
      const stats = {
        total: dataToUse.reduce((sum, c) => sum + (c.total_tickets || 0), 0),
        open: dataToUse.reduce((sum, c) => sum + (c.open_tickets || 0), 0),
        inProgress: dataToUse.reduce((sum, c) => sum + (c.in_progress_tickets || 0), 0),
        closed: dataToUse.reduce((sum, c) => sum + (c.closed_tickets || 0), 0),
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Error updating stats:', error);
      setStats({ total: 0, open: 0, inProgress: 0, closed: 0 });
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
  };

  const handleCustomerUpdate = (updatedCustomer) => {
    
    // Handle case where no customer data is provided (just a refresh request)
    if (!updatedCustomer) {
      updateStats();
      return;
    }

    // Validate customer data
    if (!updatedCustomer.id) {
      console.warn('Invalid customer update data - missing ID:', updatedCustomer);
      return;
    }


    setCustomers(prev => 
      prev.map(customer => 
        customer.id === updatedCustomer.id ? { ...customer, ...updatedCustomer } : customer
      )
    );
    
    if (selectedCustomer && selectedCustomer.id === updatedCustomer.id) {
      setSelectedCustomer(prev => ({ ...prev, ...updatedCustomer }));
    }
    
    updateStats();
  };

  const handleRefresh = () => {
    loadCustomers();
  };

  if (loading) {
    return (
      <div className="dashboard" style={{display:'grid',placeItems:'center',minHeight:'100vh'}}>
        <div className="card">
          <div className="card-body text-center">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header 
        stats={stats} 
        onRefresh={handleRefresh}
        loading={loading}
      />
      <div className="container-fluid" style={{padding:'1rem 0'}}>
        <div className="layout">
          <div className="col-sidebar">
            <CustomerList
              customers={customers}
              selectedCustomer={selectedCustomer}
              onCustomerSelect={handleCustomerSelect}
              loading={loading}
              error={error}
            />
          </div>

          <div className="col-content">
            <ErrorBoundary>
              <CustomerChatInterface
                key={selectedCustomer?.phone_number || 'no-customer'}
                phoneNumber={selectedCustomer?.phone_number}
                customerName={selectedCustomer?.name}
                onCustomerUpdate={handleCustomerUpdate}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

