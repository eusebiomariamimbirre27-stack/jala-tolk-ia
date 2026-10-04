# JALA Tolk IA — V1

Personal English speaking coach.

## What this version does
- English conversation with Gemini
- Learner level A1-C2
- Conversation / correction / speaking / work / travel / pronunciation modes
- Browser microphone input when supported
- Browser text-to-speech
- Local progress: turns, estimated minutes, streak
- Remembers recurring errors locally during use

## Deploy with GitHub + Vercel

### 1. Create a Gemini API key
Go to Google AI Studio and create an API key.
Do NOT put the key in `index.html`.

### 2. Create a GitHub repository
Create a repository named `jala-tolk-ia`.

Upload:
- index.html
- api/chat.js
- package.json

### 3. Deploy to Vercel
Import the GitHub repository into Vercel.

### 4. Add the environment variable
In Vercel project settings:
Name: GEMINI_API_KEY
Value: YOUR_GEMINI_API_KEY

Redeploy.

### 5. Open the Vercel URL
The JALA Tolk should load.

## Important
The browser SpeechRecognition API is not equally supported in every browser/device.
If microphone input is unavailable, typing still works.
Speech synthesis uses voices installed/available on the user's device.

## Next versions
V2: better real-time voice loop
V3: cloud memory with Supabase
V4: pronunciation scoring and detailed dashboard
V5: installable PWA / Android app
