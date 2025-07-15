import { supabase } from '../client';

export const createNotification = async (userId, type, title, message, metadata = {}) => {
  try {
    
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('reminder_notifications')
      .eq('user_id', userId)
      .single();

    
    if (!preferences?.reminder_notifications) {
      return { success: true, skipped: true };
    }

    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
  
    try {
      const emailResponse = await fetch('/api/send-notification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_id: data.id,
          user_id: userId,
          type,
          title,
          message,
          metadata
        })
      });
      
      if (!emailResponse.ok) {
        console.error('Failed to send email notification:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
};