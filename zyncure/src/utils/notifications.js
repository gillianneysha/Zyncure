import { supabase } from '../client';

export const createNotification = async (userId, type, title, message, metadata = {}) => {
  try {
    // Check if user has notifications enabled
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('reminder_notifications')
      .eq('user_id', userId)
      .single();

    // If notifications are disabled, don't create notification
    if (!preferences?.reminder_notifications) {
      return { success: true, skipped: true };
    }

    // Create notification
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
      // Add this after the successful notification creation (after line: if (error) throw error;)
// and before the return statement

    // Send email notification
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
      // Don't fail the notification creation if email fails
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
};