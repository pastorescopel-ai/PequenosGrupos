
export type HospitalUnit = 'Belém' | 'Barcarena';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type DayOfWeek = 'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado' | 'Domingo';
export type ChaplainStatus = 'none' | 'pending' | 'confirmed' | 'declined';
export type UserRole = 'LIDER' | 'CAPELAO' | 'ADMIN';

export type InactivationReason = 'Desistência do PG' | 'Demissão' | 'Transferência de Setor' | 'Afastamento/Licença' | 'Mudança de turno' | 'Promoção' | 'Outros';

export interface ElementPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UnitLayout {
  header: ElementPosition;
  header_bg_color?: string;
  footer: ElementPosition;
  signature: ElementPosition;
  director_name_pos: ElementPosition;
  director_title_pos: ElementPosition;
  content_y: number;
}

export interface Sector {
  id: string;
  code: string;
  name: string;
  active: boolean;
  created_at: string;
  hospital?: HospitalUnit;
}

export interface PG {
  id: string;
  name: string;
  active: boolean;
  hospital?: HospitalUnit;
}

export interface Chaplain {
  id: string;
  employee_id: string;
  name: string;
  hospital: HospitalUnit;
  active: boolean;
  email?: string;
  whatsapp?: string;
}

export interface MeetingSchedule {
  leader_id: string;
  leader_name?: string;
  leader_whatsapp?: string;
  pg_name?: string;
  sector_name?: string;
  hospital?: HospitalUnit;
  full_date: string; 
  updated_at: string;
  request_chaplain: boolean;
  request_notes?: string;
  preferred_chaplain_id?: string;
  assigned_chaplain_id?: string;
  chaplain_status: ChaplainStatus;
  chaplain_response?: string;
  chaplain_assigned_name?: string;
}

export interface Leader {
  id: string;
  full_name: string;
  employee_id: string;
  sector_id?: string;
  sector_name?: string;
  pg_name?: string;
  hospital: HospitalUnit;
  email?: string;
  whatsapp?: string;
  is_admin: boolean;
  role: UserRole;
  status: UserStatus;
  active: boolean;
  needs_password_change?: boolean;
  photo_url?: string;
  browser_notifications_enabled?: boolean;
}

export interface ReportSettings {
  director_name: string;
  director_title: string;
  footer_text: string;
  template_belem_url?: string;
  template_barcarena_url?: string;
  footer_belem_url?: string;
  footer_barcarena_url?: string;
  signature_url?: string;
  layout?: {
    belem: UnitLayout;
    barcarena: UnitLayout;
  };
}

export interface ChangeRequest {
  id: string;
  leader_id: string;
  leader_name?: string;
  collaborator_id: string;
  collaborator_name?: string;
  collaborator_sector?: string;
  type: 'add' | 'remove';
  reason_category: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_notes?: string;
}

export interface Collaborator {
  id: string;
  full_name: string;
  employee_id: string;
  sector_id: string;
  sector_name: string;
  active: boolean;
  join_date?: string;
  hospital?: HospitalUnit;
  pg_name?: string;
}

export interface PGMeetingPhoto {
  id: string;
  url: string;
  description: string;
  uploaded_at: string;
  week_number: number;
  leader_id: string;
}

export interface CoverageStats {
  sector_id: string;
  sector_code: string;
  sector_name: string;
  denominator: number;
  numerator: number;
  coverage_percent: number;
  meeting_day?: string;
  meeting_time?: string;
}
