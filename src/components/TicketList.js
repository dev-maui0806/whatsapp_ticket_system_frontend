import React, { useState, useEffect } from 'react';
import { Ticket, Clock, User, AlertCircle, X } from 'lucide-react';
import { ticketAPI } from '../services/api';

const TicketList = ({ phoneNumber, customerName, onTicketUpdate }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (phoneNumber) {
      loadTickets();
    } else {
      setTickets([]);
    }
  }, [phoneNumber]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await ticketAPI.getTicketsByCustomer(phoneNumber);
      console.log("********resposnse********", data.data.ticket);
      if (data.success) {
        // Filter out closed tickets - only show open and in_progress tickets
        const allTickets = data.data.tickets || [];
        const openTickets = allTickets.filter(ticket => ticket.status !== 'closed');
        setTickets(openTickets);
        console.log(`📋 Loaded ${openTickets.length} open tickets (filtered out ${allTickets.length - openTickets.length} closed tickets)`);
      } else {
        setError('Failed to load tickets');
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await ticketAPI.closeTicket(ticketId);
      if (response.data.success) {
        // Remove the closed ticket from the list immediately
        setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
        console.log(`✅ Ticket ${ticketId} closed and removed from list`);
        
        // Show success message
        setSuccessMessage('Ticket closed successfully! Customer has been notified.');
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Notify parent component
        if (onTicketUpdate) {
          onTicketUpdate();
        }
      } else {
        setError('Failed to close ticket');
      }
    } catch (err) {
      console.error('Error closing ticket:', err);
      setError('Failed to close ticket');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'open';
      case 'in_progress':
      case 'in-progress':
        return 'in-progress';
      case 'closed':
        return 'closed';
      default:
        return 'closed';
    }
  };

  if (!phoneNumber) {
    return (
      <div className="card" style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="card-body text-center">
          <Ticket size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Select a customer to view tickets</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Tickets will appear here once a customer is selected</div>
        </div>
      </div>
    );
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="card" style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="card-body text-center">
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading tickets...</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {customerName} - {phoneNumber}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Ticket size={20} />
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px' }}>Tickets</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {customerName} - {phoneNumber}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {error && (
          <div className="text-error" style={{ 
            textAlign: 'center', 
            padding: '1rem',
            background: 'rgba(245, 101, 101, 0.1)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-success" style={{ 
            textAlign: 'center', 
            padding: '1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            color: 'var(--success-color, #22c55e)'
          }}>
            {successMessage}
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="text-center p-4">
            <Ticket size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No tickets found</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              This customer doesn't have any tickets yet
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`ticket-item ${ticket.status === 'closed' ? 'closed' : ''}`}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem 1.25rem'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <span className={`pill ${getStatusColor(ticket.status)}`}>
                      {ticket.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-muted)',
                      fontWeight: '500'
                    }}>
                      #{ticket.ticket_number || ticket.id}
                    </span>
                  </div>
                  
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: ticket.status === 'closed' ? 'var(--text-muted)' : 'var(--text-primary)'
                  }}>
                    {ticket.subject || 'No subject'}
                  </div>
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-muted)',
                    marginBottom: '6px'
                  }}>
                    Created: {formatDateTime(ticket.created_at)}
                  </div>
                  
                  {ticket.description && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4',
                      maxHeight: '40px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {ticket.description}
                    </div>
                  )}
                </div>

                {ticket.status !== 'closed' && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleCloseTicket(ticket.id)}
                    disabled={loading}
                    style={{ 
                      padding: '0.5rem 0.75rem',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <X size={14} />
                    Close
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketList;
