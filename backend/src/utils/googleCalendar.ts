import { google } from 'googleapis';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
}

export interface TimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

/**
 * Get Google Calendar OAuth2 client
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 */
function getGoogleCalendarClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/calendar/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client;
}

/**
 * Generate OAuth2 authorization URL for Google Calendar
 */
export function getGoogleAuthUrl(userId: string): string {
  const oauth2Client = getGoogleCalendarClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass userId to retrieve after callback
    prompt: 'consent',
  });

  return url;
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessToken(code: string) {
  const oauth2Client = getGoogleCalendarClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get user's existing calendar events for a date range
 */
export async function getCalendarEvents(
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD
): Promise<CalendarEvent[]> {
  const oauth2Client = getGoogleCalendarClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(startDate).toISOString(),
    timeMax: new Date(endDate).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events: CalendarEvent[] = (response.data.items || [])
    .filter((event) => event.start?.dateTime && event.end?.dateTime)
    .map((event) => ({
      id: event.id || '',
      summary: event.summary || 'Untitled Event',
      start: event.start!.dateTime!,
      end: event.end!.dateTime!,
    }));

  return events;
}

/**
 * Check if a time slot clashes with existing calendar events
 */
export function checkClash(
  proposedSlot: TimeSlot,
  existingEvents: CalendarEvent[],
): { hasClash: boolean; clashingEvents: CalendarEvent[] } {
  const slotStart = new Date(`${proposedSlot.date}T${proposedSlot.startTime}:00`);
  const slotEnd = new Date(`${proposedSlot.date}T${proposedSlot.endTime}:00`);

  const clashingEvents = existingEvents.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Overlap check: slot starts before event ends AND slot ends after event starts
    return slotStart < eventEnd && slotEnd > eventStart;
  });

  return {
    hasClash: clashingEvents.length > 0,
    clashingEvents,
  };
}

/**
 * Create Google Calendar events for study sessions
 */
export async function createCalendarEvents(
  accessToken: string,
  sessions: Array<{
    date: string;
    startTime: string;
    endTime: string;
    topic: string;
  }>,
): Promise<Array<{ success: boolean; eventId?: string; error?: string }>> {
  const oauth2Client = getGoogleCalendarClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const results: Array<{ success: boolean; eventId?: string; error?: string }> = [];

  for (const session of sessions) {
    try {
      const startDateTime = `${session.date}T${session.startTime}:00`;
      const endDateTime = `${session.date}T${session.endTime}:00`;

      const event = {
        summary: `📚 Study: ${session.topic}`,
        description: `AI-generated study session from Smart Study Planner`,
        start: {
          dateTime: startDateTime,
          timeZone: 'Asia/Kolkata', // Adjust to user's timezone
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Asia/Kolkata',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'popup', minutes: 5 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      results.push({
        success: true,
        eventId: response.data.id || undefined,
      });
    } catch (error: any) {
      console.error(`Failed to create calendar event for ${session.topic}:`, error.message);
      results.push({
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  try {
    const oauth2Client = getGoogleCalendarClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

/**
 * Find available time slots in a day avoiding clashes
 */
export function findAvailableSlots(
  date: string,
  existingEvents: CalendarEvent[],
  totalHoursNeeded: number,
  slotDurationMinutes: number = 60,
): TimeSlot[] {
  const availableSlots: TimeSlot[] = [];
  const dayStart = 8; // 8 AM
  const dayEnd = 22; // 10 PM

  let currentHour = dayStart;
  let hoursScheduled = 0;

  while (currentHour < dayEnd && hoursScheduled < totalHoursNeeded) {
    const slotStart = `${String(currentHour).padStart(2, '0')}:00`;
    const slotEnd = `${String(currentHour + 1).padStart(2, '0')}:00`;

    const clash = checkClash(
      { date, startTime: slotStart, endTime: slotEnd },
      existingEvents,
    );

    if (!clash.hasClash) {
      availableSlots.push({ date, startTime: slotStart, endTime: slotEnd });
      hoursScheduled++;
    }

    currentHour++;
  }

  return availableSlots;
}
