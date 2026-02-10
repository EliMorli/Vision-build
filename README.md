# VisionBuild

Home renovation visualization tool — from imagination to contractor execution.

## Stack

- **Frontend**: React Native + Expo (TypeScript)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o (analysis + email), Replicate SDXL (image gen)
- **Email**: Resend

## Getting Started

```bash
npm install
npx expo start
```

## Environment Variables

Create a `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Set these in Supabase Dashboard > Edge Functions > Secrets:

```
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
RESEND_API_KEY=re_...
```
