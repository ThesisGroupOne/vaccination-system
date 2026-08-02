"use client";

import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  PackageIcon, 
  SyringeIcon,
  CheckIcon,
  Trash2Icon,
  FilterIcon,
  SearchIcon,
  Loader2Icon
} from 'lucide-react';

// Define a type for notifications to handle the icons properly
type NotificationData = {
  id: number;
  original_id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:9999/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return `1 day ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'emergency': return ClockIcon;
      case 'stock': return PackageIcon;
      case 'vaccination': return SyringeIcon;
      case 'alert': return AlertTriangleIcon;
      default: return BellIcon;
    }
  };

  const getColorClassesForType = (type: string) => {
    switch (type) {
      case 'emergency': return 'text-red-600 bg-red-50 border-red-100';
      case 'stock': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'vaccination': return 'text-green-600 bg-green-50 border-green-100';
      case 'alert': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter !== 'all' && filter !== 'unread') {
      if (n.type !== filter) return false;
    }
    if (filter === 'unread' && n.isRead) return false;
    
    if (searchQuery) {
      return n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             n.message.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <BellIcon className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications & Alerts</h1>
            <p className="text-sm text-gray-500 font-medium">You have <span className="text-blue-600 font-bold">{unreadCount}</span> unread messages</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm"
          >
            <CheckIcon className="w-4 h-4" />
            Mark all as read
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {['all', 'unread', 'emergency', 'stock', 'vaccination'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:w-64">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search alerts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2Icon className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const Icon = getIconForType(notification.type);
            const colorClasses = getColorClassesForType(notification.type);
            
            return (
              <div 
                key={notification.id} 
                className={`relative group p-5 bg-white rounded-2xl border transition-all duration-300 hover:shadow-md flex gap-4 ${
                  !notification.isRead 
                    ? 'border-blue-200 shadow-sm' 
                    : 'border-gray-100 opacity-80'
                }`}
              >
                {/* Unread Indicator */}
                {!notification.isRead && (
                  <div className="absolute top-5 right-5 w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
                )}

                {/* Icon */}
                <div className={`p-3 rounded-xl h-fit border ${colorClasses}`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`text-base font-bold truncate ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {formatTime(notification.time)}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${!notification.isRead ? 'text-gray-600 font-medium' : 'text-gray-500'}`}>
                    {notification.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                  {!notification.isRead && (
                    <button 
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete alert"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellIcon className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No notifications found</h3>
            <p className="text-gray-500 text-sm">We couldn't find any alerts matching your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
