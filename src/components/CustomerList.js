import React from 'react';
import { MessageSquare, Clock, AlertCircle, User } from 'lucide-react';

const CustomerList = ({ customers, selectedCustomer, onCustomerSelect, loading, error }) => {
  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center p-4">
            <div style={{ fontSize: '14px', fontWeight: '500' }}>Loading customers...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center p-4 text-error">
            <div style={{ fontSize: '14px', fontWeight: '500' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body" style={{ padding: 0 }}>
        {customers.length === 0 ? (
          <div className="text-center p-4 text-muted">
            <User size={48} className="mb-3" style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '14px', fontWeight: '500' }}>No customers found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Customers will appear here when they start chatting</div>
          </div>
        ) : (
          <div style={{ padding: '0.5rem', position:'relative', height:'70vh', overflow:"auto" }}>
            {customers.map((customer) => (
              <div
                key={customer.id}
                className={`ticket-item ${
                  selectedCustomer && selectedCustomer.id === customer.id ? 'is-selected' : ''
                }`}
                onClick={() => onCustomerSelect(customer)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--accent-gradient)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {(customer.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '14px',
                      color: selectedCustomer && selectedCustomer.id === customer.id ? 'white' : 'var(--text-primary)',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {customer.name || 'Unknown Customer'}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: selectedCustomer && selectedCustomer.id === customer.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                      marginBottom: '6px'
                    }}>
                      {customer.phone_number}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="pill open">
                        {customer.open_tickets || 0} open
                      </span>
                      <span className="pill in-progress">
                        {customer.pending_chats || 0} pending
                      </span>
                    </div>
                  </div>
                  <div>
                    {customer.pending_chats > 0 && (
                      <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;
