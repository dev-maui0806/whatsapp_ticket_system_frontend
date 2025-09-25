import React, { useEffect, useState, useRef } from 'react';
import socketService from '../services/socket';
import { customerAPI, formatDateTime } from '../services/api';
import TicketList from './TicketList';

const CustomerChatInterface = ({ phoneNumber, customerName, onCustomerUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState({ limit: 30, offset: 0, order: 'DESC', hasMore: true, isLoadingMore: false });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [formStep, setFormStep] = useState(null);
  const [interactiveMessage, setInteractiveMessage] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('chat');
  const [hasOpenTickets, setHasOpenTickets] = useState(false);
  const endRef = useRef(null);
  // Track what kind of update changed the messages: 'replace' | 'prepend' | 'append'
  const lastUpdateTypeRef = useRef('replace');
  const prevPhoneNumberRef = useRef(null);

  useEffect(() => {
    if (!phoneNumber) {
      setMessages([]);
      setError(null);
      prevPhoneNumberRef.current = null;
      return;
    }
    
    // Only reload messages if the phone number actually changed
    if (prevPhoneNumberRef.current !== phoneNumber) {
      prevPhoneNumberRef.current = phoneNumber;
      // Reset pagination and load latest window
      setPage({ limit: 30, offset: 0, order: 'DESC', hasMore: true, isLoadingMore: false });
      loadMessages(phoneNumber, { limit: 30, offset: 0, order: 'DESC' }, true);
      checkOpenTickets(phoneNumber);
      // Acknowledge messages when counselor opens chat
      acknowledgeMessages(phoneNumber);
    }

    // Connect to socket
    socketService.connect();

    const handleCustomerConnected = (data) => {
      setCurrentTicket(data.existingTicket);
      // Do not inject artificial welcome messages here.
      // The chat should reflect only what exists in the messages table or comes via sockets.
    };

    const handleInteractiveMessage = (data) => {
      setInteractiveMessage(data);
      addMessage({
        type: 'system',
        text: `${data.header}\n\n${data.body}`,
        timestamp: new Date(),
        interactive: true,
        buttons: data.buttons
      });
    };

    const handleFormStep = (data) => {
      setFormStep(data);
      addMessage({
        type: 'system',
        text: `${data.title}\n\nPlease provide the following information:`,
        timestamp: new Date(),
        form: true,
        fields: data.fields || [data.field]
      });
    };

    const handleSystemMessage = (data) => {
      addMessage({
        type: 'system',
        text: data.message,
        timestamp: new Date()
      });
    };

    const handleTicketCreated = (data) => {
      setCurrentTicket(data.ticket);
      addMessage({
        type: 'system',
        text: `✅ ${data.message}`,
        timestamp: new Date()
      });
      setFormStep(null);
      setInteractiveMessage(null);
    };

    const handleNewAgentMessage = (data) => {
      addMessage({
        type: 'agent',
        text: data.message.message_text,
        timestamp: new Date(data.message.created_at)
      });
    };

    const handleNewCustomerMessage = (data) => {
      try {
        const incomingPhone = data?.phone_number || data?.customer?.phone_number;
        if (!incomingPhone || incomingPhone !== phoneNumber) return;
        if (!data.message) return;
        addMessage({
          type: data.message.sender_type || 'customer',
          text: data.message.message_text,
          timestamp: new Date(data.message.created_at || Date.now()),
          id: data.message.id || `srv_${Date.now()}`
        });
      } catch (e) {
        console.error('Failed to handle newCustomerMessage:', e);
      }
    };

    const handleError = (data) => {
      setError(data.message);
      addMessage({
        type: 'error',
        text: `Error: ${data.message}`,
        timestamp: new Date()
      });
    };

    const handleMessagesAcknowledged = (data) => {
      if (data.success) {
        // Notify parent component to refresh customer list
        if (onCustomerUpdate) {
          onCustomerUpdate();
        }
      }
    };

    // Add event listeners
    socketService.on('customerConnected', handleCustomerConnected);
    socketService.on('interactiveMessage', handleInteractiveMessage);
    socketService.on('formStep', handleFormStep);
    socketService.on('systemMessage', handleSystemMessage);
    socketService.on('ticketCreated', handleTicketCreated);
    socketService.on('newAgentMessage', handleNewAgentMessage);
    socketService.on('newCustomerMessage', handleNewCustomerMessage);
    socketService.on('messagesAcknowledged', handleMessagesAcknowledged);
    socketService.on('error', handleError);

    return () => {
      // Cleanup event listeners
      socketService.off('customerConnected', handleCustomerConnected);
      socketService.off('interactiveMessage', handleInteractiveMessage);
      socketService.off('formStep', handleFormStep);
      socketService.off('systemMessage', handleSystemMessage);
      socketService.off('ticketCreated', handleTicketCreated);
      socketService.off('newAgentMessage', handleNewAgentMessage);
      socketService.off('newCustomerMessage', handleNewCustomerMessage);
      socketService.off('messagesAcknowledged', handleMessagesAcknowledged);
      socketService.off('error', handleError);
    };
  }, [phoneNumber, customerName]);

  useEffect(() => {
    // Only auto-scroll to bottom when messages were appended (new incoming or send)
    // or after a full replace. Do NOT scroll after prepending older messages.
    if (lastUpdateTypeRef.current === 'append' || lastUpdateTypeRef.current === 'replace') {
      if (endRef.current) {
        endRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
    // Reset marker after handling
    lastUpdateTypeRef.current = 'idle';
  }, [messages]);

  const loadMessages = async (phoneNumber, opts = page, replace = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerAPI.getCustomerMessages(phoneNumber, opts.limit, opts.offset, opts.order);
      if (res.data.success) {
        const data = res.data.data || [];
        // We requested DESC (latest first). For display top-to-bottom, reverse once.
        const normalized = (opts.order === 'DESC') ? [...data].reverse() : data;
        const container = containerRef.current;
        const prevScrollHeight = container ? container.scrollHeight : 0;
        if (replace) {
          lastUpdateTypeRef.current = 'replace';
          setMessages(normalized);
        } else {
          lastUpdateTypeRef.current = 'prepend';
          setMessages(prev => [...normalized, ...prev]); // prepend older batch at top
        }
        // After DOM updates, keep the user's viewport anchored when prepending
        if (!replace && container) {
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            const delta = newScrollHeight - prevScrollHeight;
            if (delta > 0) {
              container.scrollTop = delta; // maintain position
            }
          }, 0);
        }
        // Update hasMore by batch size
        setPage(prev => ({ ...prev, hasMore: data.length === opts.limit }));
      } else {
        setError('Failed to load messages');
      }
    } catch (e) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll: when user scrolls to top, load older messages
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const loadOlderIfNeeded = () => {
      
      if (page.isLoadingMore || !page.hasMore) return;
      
      // Load when scrolled to the very top of the chat-body container
      // The chat-body has height: calc(70vh - 140px) and overflow-y: auto
      if (el.scrollTop <= 100) {
        console.log("Loading older messages...");
        const next = { ...page, offset: page.offset + page.limit };
        setPage(prev => ({ ...prev, isLoadingMore: true }));
        loadMessages(phoneNumber, next, false).finally(() => {
          setPage(prev => ({ ...prev, offset: next.offset, isLoadingMore: false }));
        });
      }
    };

    const onScroll = () => {
      loadOlderIfNeeded();
    };

    // Always attach the listener to the chat-body container
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (el) el.removeEventListener('scroll', onScroll);
    };
  }, [phoneNumber, page.hasMore, page.isLoadingMore, page.offset]);

  const checkOpenTickets = async (phoneNumber) => {
    try {
      const response = await customerAPI.getTicketsByCustomer(phoneNumber);
      if (response.data.success) {
        const tickets = response.data.data || [];
        // const openTickets = tickets.filter(ticket => ticket.status !== 'closed');
        // setHasOpenTickets(openTickets.length > 0);
      }
    } catch (error) {
      console.error('Error checking open tickets:', error);
    }
  };

  const acknowledgeMessages = (phoneNumber) => {
    try {
      socketService.acknowledgeMessages(phoneNumber);
    } catch (error) {
      console.error('Error acknowledging messages:', error);
    }
  };

  const addMessage = (message) => {
    try {
      if (!message) return;
      
      const messageWithId = {
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: message.timestamp || new Date(),
        text: message.text || message.message_text || 'Message',
        type: message.type || message.sender_type || 'customer'
      };
      
      lastUpdateTypeRef.current = 'append';
      setMessages(prev => {
        // Check for duplicate messages
        const isDuplicate = prev.some(existingMsg => 
          existingMsg.id === messageWithId.id || 
          (existingMsg.text === messageWithId.text && 
           Math.abs(new Date(existingMsg.timestamp) - new Date(messageWithId.timestamp)) < 1000)
        );
        
        if (isDuplicate) {
          return prev;
        }
        
        return [...prev, messageWithId];
      });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !phoneNumber) return;
    
    // Check if there are open tickets - if not, don't allow sending messages
  
    const messageText = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Add agent message to chat immediately for better UX
    const tempMessage = {
      type: 'agent',
      text: messageText,
      timestamp: new Date(),
      id: `temp_${Date.now()}`
    };
    addMessage(tempMessage);

    try {
      // Send message via API
      const result = await customerAPI.sendMessageToCustomer(phoneNumber, messageText, 1);
      
      if (result.data.success) {
        ('✅ Message sent successfully');
        // Update customer stats if callback provided
        if (onCustomerUpdate) {
          onCustomerUpdate();
        }
      } else {
        throw new Error(result.data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      addMessage({
        type: 'error',
        text: 'Failed to send message',
        timestamp: new Date(),
        id: `error_${Date.now()}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (buttonId, buttonTitle) => {
    setInteractiveMessage(null);
    addMessage({
      type: 'customer',
      text: `Selected: ${buttonTitle}`,
      timestamp: new Date()
    });

    // Send interactive response
    socketService.sendInteractiveResponse(buttonId, buttonTitle);
  };

  const handleFormSubmit = (stepData) => {
    if (!formStep) {
      console.error('No form step available for submission');
      return;
    }

    const currentStep = formStep.step;
    setFormStep(null);
    setFormData(prev => ({ ...prev, ...stepData }));

    // Add form data to chat
    const formText = Object.entries(stepData)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    addMessage({
      type: 'customer',
      text: formText,
      timestamp: new Date()
    });

    // Send form step completion
    socketService.sendFormStepComplete(currentStep, stepData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTicketUpdate = () => {
    // Refresh open tickets status when a ticket is updated
    if (phoneNumber) {
      checkOpenTickets(phoneNumber);
    }
    // Notify parent component
    if (onCustomerUpdate) {
      onCustomerUpdate();
    }
  };

  if (!phoneNumber) {
    return (
      <div className="card" style={{height:'70vh',display:'grid',placeItems:'center'}}>
        <div className="card-body text-center">Select a customer to start chatting</div>
      </div>
    );
  }

  // Show loading state during initialization
  if (loading && messages.length === 0) {
    return (
      <div className="card" style={{height:'70vh',display:'grid',placeItems:'center'}}>
        <div className="card-body text-center">
          <div>Loading chat interface...</div>
          <div className="text-muted" style={{fontSize: '12px', marginTop: '10px'}}>
            {phoneNumber}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{height:'70vh', display:'flex', flexDirection:'column'}}>
      {/* Tab Navigation */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button 
          className={`tab ${activeTab === 'ticket' ? 'active' : ''}`}
          onClick={() => setActiveTab('ticket')}
        >
          Tickets
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' ? (
        <>
          <div className="chat-header">
            <div style={{fontWeight:600}}>{customerName || 'Customer'}</div>
            <div className="text-muted" style={{fontSize:12}}>{phoneNumber}</div>
            {/* {!hasOpenTickets && (
              <div style={{fontSize:11, color:'var(--warning)', marginTop:4}}>
                ⚠️ No open tickets
              </div>
            )} */}
          </div>

          <div className="chat-body" ref={containerRef} >
            {loading && messages.length === 0 ? (
              <div className="text-muted">Loading messages...</div>
            ) : (
              messages.map((m) => {
                if (!m) return null;
                
                const messageText = m.message_text || m.text || 'Message';
                const messageTime = m.created_at || m.timestamp;
                const senderType = m.sender_type || m.type || 'customer';
                
                return (
                  <div key={m.id || Date.now()}>
                    <div className={`chat-bubble ${senderType === 'agent' || senderType === 'system' ? 'agent' : 'customer'}`}>
                      <div style={{whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{messageText}</div>
                      <div className="chat-meta">
                        {messageTime ? formatDateTime(messageTime) : new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {error && (<div className="text-error" style={{fontSize:12}}>{error}</div>)}
            <div ref={endRef} />
          </div>
          
          <div className="chat-input">
            <input
              placeholder={!loading ? "Type a message..." : "Connecting..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage();}}
              disabled={loading}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleSendMessage} 
              disabled={loading || !input.trim() || !hasOpenTickets}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </>
      ) : (
        <TicketList 
          phoneNumber={phoneNumber}
          customerName={customerName}
          onTicketUpdate={handleTicketUpdate}
        />
      )}
    </div>
  );
};

export default CustomerChatInterface;
