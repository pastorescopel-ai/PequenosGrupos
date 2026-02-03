
-- SCHEMA UPDATE: Logística Inteligente de Capelania
-- Versão 7.0

CREATE TABLE chaplains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL UNIQUE, -- Referência à matrícula do RH
  name text NOT NULL,
  hospital text NOT NULL CHECK (hospital IN ('Belém', 'Barcarena')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_schedules 
ADD COLUMN preferred_chaplain_id uuid REFERENCES chaplains(id),
ADD COLUMN assigned_chaplain_id uuid REFERENCES chaplains(id);

-- Índice para busca de conflitos de horário
CREATE INDEX idx_meeting_chaplain_overlap ON meeting_schedules(assigned_chaplain_id, full_date) 
WHERE chaplain_status = 'confirmed';
