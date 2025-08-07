import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Clock, Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, removeNotification, clearAll } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="absolute right-0 top-12 w-96 glass-strong rounded-xl border border-white/20 shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Notifications</h3>
        <div className="flex items-center space-x-2">
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs mt-1 opacity-75">You're all caught up!</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              const iconColor = getIconColor(notification.type);
              
              return (
                <div
                  key={notification.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-white/70 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-white/50">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>Just now</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white/70 transition-all ml-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-white/10">
          <button className="w-full text-center text-sm text-white/70 hover:text-white transition-colors">
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;