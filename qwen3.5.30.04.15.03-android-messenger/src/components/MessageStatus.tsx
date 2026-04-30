import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  showTime?: boolean;
  timestamp?: Date;
}

export function MessageStatus({ status, showTime = true, timestamp }: MessageStatusProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3.5 h-3.5 text-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-[#3390ec]" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-1">
      {showTime && timestamp && (
        <span className="text-[11px] text-gray-400">
          {formatTime(timestamp)}
        </span>
      )}
      {getStatusIcon()}
    </div>
  );
}
