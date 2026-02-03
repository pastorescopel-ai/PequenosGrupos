
# Sistema Hospitalar de Gestão de PGs (Pequenos Grupos)

Solução enterprise para gestão de cobertura ministerial por setor hospitalar.

## Configuração Obrigatória (Supabase)

1. **Auth**: Habilitar provedor E-mail/Senha.
2. **Storage**: Criar buckets `assets` (público para logo/assinatura) e `reports` (privado para PDFs).
3. **SQL**: Execute o conteúdo de `schema.sql` no SQL Editor do Supabase.

## Variáveis de Ambiente (.env)

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role (Apenas Server)
CRON_SECRET=token_seguro_para_vercel_cron
SITE_URL=http://localhost:3000
```

## Funcionalidades Principais

- **Meta de 80%**: Cálculo automático baseado na base oficial importada por setor vs. matriculados em PGs.
- **Fluxo de Aprovação**: Líderes solicitam remoção; Admins aprovam para garantir integridade dos dados.
- **Relatórios Automatizados**: Geração de PDF server-side com papel timbrado e assinatura digitalizada.
- **Importação em Lote**: Normalização de nomes e deduplicação inteligente.

## Cron Job (Vercel)

Configure em `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/generate-sector-reports?token=SEU_CRON_SECRET",
    "schedule": "0 0 * * 1"
  }]
}
```

## Desenvolvimento

Para rodar localmente:
1. `npm install`
2. `npm run dev`

Dependências principais:
- `@react-pdf/renderer`: Geração de PDFs institucionais.
- `lucide-react`: Iconografia.
- `shadcn/ui` + `tailwind`: Interface visual.
