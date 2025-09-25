import React from 'react';
import { 
  MessageSquare, 
  RefreshCw, 
  Bell, 
  Settings,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import socketService from '../services/socket';

const Header = ({ stats, onRefresh, loading }) => {
  const [connectionStatus, setConnectionStatus] = React.useState({ connected: false });

  React.useEffect(() => {
    const handleConnectionStatus = (status) => {
      setConnectionStatus(status);
    };

    socketService.on('connectionStatus', handleConnectionStatus);
    
    // Get initial status
    const status = socketService.getConnectionStatus();
    setConnectionStatus(status);

    return () => {
      socketService.off('connectionStatus', handleConnectionStatus);
    };
  }, []);

  return (
    <header className="header">
      <div className="container-fluid">
        <div className="header-inner">
          {/* Logo and Title */}
          <div className="brand">
            <div className="brand-badge">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="brand-title">WhatsApp Ticketing System</div>
              <div className="brand-subtitle">Agent Dashboard</div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats">
            <div className="stat"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
            <div className="stat"><div className="stat-value">{stats.open}</div><div className="stat-label">Open</div></div>
            <div className="stat"><div className="stat-value">{stats.inProgress}</div><div className="stat-label">In Progress</div></div>
            <div className="stat"><div className="stat-value">{stats.closed}</div><div className="stat-label">Closed</div></div>
          </div>

          {/* Actions */}
          <div className="actions">
            {/* Connection Status */}
            <div className="badge-online">
              {connectionStatus.connected ? (
                <><Wifi size={14} /> Online</>
              ) : (
                <><WifiOff size={14} /> Offline</>
              )}
            </div>

            {/* Socket Demo Link */}
            {/* <Link to="/socket-demo" className="btn btn-secondary">
              <Zap size={14} /> Socket Demo
            </Link> */}

            {/* Refresh Button */}
            {/* <button onClick={onRefresh} disabled={loading} className="btn btn-primary">
              <RefreshCw size={14} /> Refresh
            </button> */}

            {/* Notifications */}
            <button className="btn"><Bell size={14} /></button>

            {/* Settings */}
            <button className="btn"><Settings size={14} /></button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
