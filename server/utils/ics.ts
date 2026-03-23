/**
 * Gerador de arquivos ICS (iCalendar) para convites de reunião do CPPD.
 * 
 * Formato: RFC 5545 (iCalendar)
 * Compatível com: Google Calendar, Outlook, Apple Calendar, Thunderbird
 * 
 * Uso:
 *   const icsContent = buildMeetingIcs({ ... });
 *   // Anexar ao e-mail como "convite.ics" com content_type "text/calendar"
 */

export interface MeetingIcsData {
  /** Identificador único do evento (para atualizações) */
  uid: string;
  /** Título da reunião */
  title: string;
  /** Descrição/pauta da reunião */
  description: string;
  /** Data/hora de início (Date ou ISO string) */
  startDate: Date | string;
  /** Data/hora de término (Date ou ISO string) */
  endDate: Date | string;
  /** Local da reunião (sala, link de videoconferência, etc.) */
  location?: string;
  /** Nome do organizador */
  organizerName: string;
  /** E-mail do organizador */
  organizerEmail: string;
  /** Lista de participantes */
  attendees?: Array<{
    name: string;
    email: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR';
  }>;
  /** URL da reunião (link para a plataforma) */
  url?: string;
  /** Alarme/lembrete em minutos antes do evento */
  reminderMinutes?: number;
  /** Sequência (para atualizações, incrementar a cada mudança) */
  sequence?: number;
  /** Status do evento */
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

/**
 * Formata Date para o formato ICS (YYYYMMDDTHHMMSSZ)
 */
function formatIcsDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escapa texto para uso em campos ICS (fold lines, escape chars)
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Gera o conteúdo de um arquivo ICS (iCalendar) para uma reunião.
 * 
 * @param data - Dados da reunião
 * @returns String com o conteúdo do arquivo .ics
 */
export function buildMeetingIcs(data: MeetingIcsData): string {
  const now = formatIcsDate(new Date());
  const start = formatIcsDate(data.startDate);
  const end = formatIcsDate(data.endDate);
  const sequence = data.sequence ?? 0;
  const status = data.status ?? 'CONFIRMED';
  const reminder = data.reminderMinutes ?? 30;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seusdados//CPPD Governanca//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${data.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(data.title)}`,
    `DESCRIPTION:${escapeIcsText(data.description)}`,
    `STATUS:${status}`,
    `SEQUENCE:${sequence}`,
    `ORGANIZER;CN=${escapeIcsText(data.organizerName)}:mailto:${data.organizerEmail}`,
  ];

  // Local
  if (data.location) {
    lines.push(`LOCATION:${escapeIcsText(data.location)}`);
  }

  // URL
  if (data.url) {
    lines.push(`URL:${data.url}`);
  }

  // Participantes
  if (data.attendees && data.attendees.length > 0) {
    for (const att of data.attendees) {
      const role = att.role || 'REQ-PARTICIPANT';
      lines.push(
        `ATTENDEE;ROLE=${role};PARTSTAT=NEEDS-ACTION;CN=${escapeIcsText(att.name)}:mailto:${att.email}`
      );
    }
  }

  // Alarme/lembrete
  if (reminder > 0) {
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT' + reminder + 'M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Lembrete: ${escapeIcsText(data.title)}`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  // Fold lines > 75 chars (RFC 5545 requirement)
  return lines.map(line => {
    if (line.length <= 75) return line;
    const parts: string[] = [];
    let remaining = line;
    parts.push(remaining.substring(0, 75));
    remaining = remaining.substring(75);
    while (remaining.length > 0) {
      parts.push(' ' + remaining.substring(0, 74));
      remaining = remaining.substring(74);
    }
    return parts.join('\r\n');
  }).join('\r\n') + '\r\n';
}

/**
 * Gera UID único para eventos ICS do CPPD.
 * Formato: cppd-<orgId>-meeting-<meetingId>@seusdados.com
 */
export function generateMeetingIcsUid(organizationId: number, meetingId: number): string {
  return `cppd-org${organizationId}-meeting${meetingId}@seusdados.com`;
}
