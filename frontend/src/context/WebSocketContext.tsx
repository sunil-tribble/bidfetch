import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNotifications } from './NotificationContext';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketMessage {
  type: 'opportunity_update' | 'new_opportunity' | 'document_ready' | 'sync_status' | 'error';
  data: any;
  timestamp: string;
}

interface WebSocketContextType {
  status: WebSocketStatus;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  subscribe: (type: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [subscribers, setSubscribers] = useState<Map<string, ((data: any) => void)[]>>(new Map());
  const { addNotification } = useNotifications();

  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const newWs = new WebSocket(wsUrl);
      
      newWs.onopen = () => {
        setStatus('connected');
        console.log('WebSocket connected');
        
        // Send authentication if needed
        newWs.send(JSON.stringify({ type: 'auth', token: localStorage.getItem('auth_token') }));
      };
      
      newWs.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Notify subscribers
          const callbacks = subscribers.get(message.type) || [];
          callbacks.forEach(callback => callback(message.data));
          
          // Handle global message types
          switch (message.type) {
            case 'new_opportunity':
              addNotification({
                type: 'info',
                title: 'New Opportunity',
                message: `${message.data.title} has been added`
              });
              break;
            case 'document_ready':
              addNotification({
                type: 'success',
                title: 'Document Ready',
                message: `Document ${message.data.filename} is now available`
              });
              break;
            case 'error':
              addNotification({
                type: 'error',
                title: 'System Error',
                message: message.data.message
              });
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      newWs.onclose = () => {
        setStatus('disconnected');
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            connect();
          }
        }, 3000);
      };
      
      newWs.onerror = (error) => {
        setStatus('error');
        console.error('WebSocket error:', error);
      };
      
      setWs(newWs);
    } catch (error) {
      setStatus('error');
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [ws, subscribers, addNotification]);

  useEffect(() => {
    connect();
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'disconnected') {
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (ws) {
        ws.close();
      }
    };
  }, [connect, status]);

  const sendMessage = useCallback((message: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [ws]);

  const subscribe = useCallback((type: string, callback: (data: any) => void) => {
    setSubscribers(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(type) || [];
      newMap.set(type, [...existing, callback]);
      return newMap;
    });

    // Return unsubscribe function
    return () => {
      setSubscribers(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(type) || [];
        const filtered = existing.filter(cb => cb !== callback);
        if (filtered.length === 0) {
          newMap.delete(type);
        } else {
          newMap.set(type, filtered);
        }
        return newMap;
      });
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{
      status,
      lastMessage,
      sendMessage,
      subscribe
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};