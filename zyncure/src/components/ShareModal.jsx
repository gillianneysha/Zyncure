import React, { useState, useEffect } from 'react';
import { X, User, Clock, Calendar, Trash2, Share } from 'lucide-react';

const ShareModal = ({ 
  isOpen, 
  onClose, 
  item, // { id, name, type: 'file' | 'folder', file?: fileObject }
  currentUserId,
  supabase 
}) => {
  const [connections, setConnections] = useState([]);
  const [activeShares, setActiveShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [durationType, setDurationType] = useState('hours');
  const [durationValue, setDurationValue] = useState('24');
  const [customDate, setCustomDate] = useState('');
  const [noExpiration, setNoExpiration] = useState(false);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchConnections();
      fetchActiveShares();
    }
  }, [isOpen, currentUserId, item?.id]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      // Fetch connected doctors - adjust this query based on your connections table structure
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          doctor:connected_user_id(id, email, full_name, role)
        `)
        .eq('user_id', currentUserId)
        .eq('status', 'accepted') // assuming you have a status field
        .eq('doctor.role', 'doctor'); // assuming doctors have a role field

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      alert('Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveShares = async () => {
    if (!item?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('file_shares')
        .select(`
          *,
          shared_user:shared_with_id(id, email, full_name)
        `)
        .eq(item.type === 'file' ? 'file_id' : 'folder_id', item.id)
        .eq('owner_id', currentUserId)
        .eq('is_active', true);

      if (error) throw error;
      setActiveShares(data || []);
    } catch (error) {
      console.error('Error fetching active shares:', error);
    }
  };

  const calculateExpirationDate = () => {
    if (noExpiration) return null;
    
    const now = new Date();
    
    if (durationType === 'custom') {
      return customDate ? new Date(customDate) : null;
    }
    
    const value = parseInt(durationValue);
    if (isNaN(value)) return null;
    
    switch (durationType) {
      case 'hours':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'days':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'weeks':
        return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      case 'months': {
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() + value);
        return monthDate;
      }
      default:
        return null;
    }
  };

  const handleShare = async () => {
    if (!selectedDoctorId) {
      alert('Please select a doctor to share with');
      return;
    }

    const expirationDate = calculateExpirationDate();
    
    try {
      setLoading(true);
      
      const shareData = {
        [item.type === 'file' ? 'file_id' : 'folder_id']: item.id,
        owner_id: currentUserId,
        shared_with_id: selectedDoctorId,
        share_type: item.type,
        expires_at: expirationDate?.toISOString() || null,
        is_active: true
      };

      const { error } = await supabase
        .from('file_shares')
        .insert([shareData]);

      if (error) throw error;

      // Reset form
      setSelectedDoctorId('');
      setDurationValue('24');
      setDurationType('hours');
      setCustomDate('');
      setNoExpiration(false);
      
      // Refresh active shares
      await fetchActiveShares();
      
      alert(`${item.type === 'file' ? 'File' : 'Folder'} shared successfully!`);
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      const { error } = await supabase
        .from('file_shares')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', shareId)
        .eq('owner_id', currentUserId);

      if (error) throw error;
      
      await fetchActiveShares();
      alert('Share revoked successfully');
    } catch (error) {
      console.error('Error revoking share:', error);
      alert('Failed to revoke share');
    }
  };

  const formatExpirationDate = (dateString) => {
    if (!dateString) return 'No expiration';
    const date = new Date(dateString);
    const now = new Date();
    
    if (date < now) return 'Expired';
    
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'Expires soon';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share size={20} className="text-teal-500" />
            Share {item?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Share with doctor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share with Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              disabled={loading}
            >
              <option value="">Select a doctor...</option>
              {connections.map((connection) => (
                <option key={connection.doctor.id} value={connection.doctor.id}>
                  {connection.doctor.full_name || connection.doctor.email}
                </option>
              ))}
            </select>
          </div>

          {/* Duration settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Duration
            </label>
            
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="noExpiration"
                checked={noExpiration}
                onChange={(e) => setNoExpiration(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="noExpiration" className="text-sm text-gray-700">
                No expiration
              </label>
            </div>

            {!noExpiration && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    min="1"
                    disabled={durationType === 'custom'}
                  />
                  <select
                    value={durationType}
                    onChange={(e) => setDurationType(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>

                {durationType === 'custom' && (
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={loading || !selectedDoctorId}
            className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sharing...' : 'Share Access'}
          </button>

          {/* Active shares */}
          {activeShares.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Active Shares</h3>
              <div className="space-y-2">
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">
                          {share.shared_user?.full_name || share.shared_user?.email}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} />
                          {formatExpirationDate(share.expires_at)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Revoke access"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;