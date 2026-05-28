# ThesisForge AI - Deployment Guide
## Mobile App (PWA) Banane ke Steps

---

## ✅ Option 1: Vercel pe Deploy (RECOMMENDED - Free & Easiest)

### Step 1: GitHub Account Banao
1. https://github.com pe jao
2. Sign Up karo (free)

### Step 2: New Repository Banao
1. GitHub pe "New Repository" click karo
2. Name: `thesisforge-ai`
3. Public select karo
4. Create Repository

### Step 3: Files Upload Karo
1. Repository mein "uploading an existing file" click karo
2. Ye saare files upload karo:
   - `package.json`
   - `src/` folder (App.js, index.js)
   - `public/` folder (index.html, manifest.json, sw.js)
3. "Commit changes" click karo

### Step 4: Vercel pe Deploy
1. https://vercel.com jao
2. "Sign Up with GitHub" karo
3. "New Project" click karo
4. Apna `thesisforge-ai` repository select karo
5. Framework: **Create React App** select karo
6. "Deploy" click karo
7. 2-3 minute mein app live ho jayegi!

### Step 5: Phone Pe App Install Karo
1. Vercel ka link milega jaise: `thesisforge-ai.vercel.app`
2. Phone ke Chrome mein open karo
3. 3 dots menu → "Add to Home Screen"
4. "Add" press karo
5. **Done! App home screen pe aa jayega** 🎉

---

## ✅ Option 2: Netlify pe Deploy (bhi Free)

1. https://netlify.com jao
2. GitHub se sign up karo
3. "New site from Git" → repository select karo
4. Build command: `npm run build`
5. Publish directory: `build`
6. Deploy!

---

## 🔑 Important: Anthropic API Key

AI Help feature ke liye API key chahiye:

1. https://console.anthropic.com pe jao
2. Account banao
3. "API Keys" → "Create Key"
4. Key copy karo

### Key Set Karna (Vercel mein):
1. Vercel dashboard → apna project
2. Settings → Environment Variables
3. Add: `REACT_APP_ANTHROPIC_KEY` = (tumhari key)
4. Redeploy karo

---

## 📱 Features List
- ✅ 8 Chapter-wise writing sections
- ✅ AI Writing Assistant (Claude powered)
- ✅ Grammar & Spell Check
- ✅ Plagiarism Checker
- ✅ APA/MLA/Chicago/Harvard/IEEE Citations
- ✅ Download as TXT & HTML/Word
- ✅ PWA - Phone pe install hota hai
- ✅ Offline support (basic)
- ✅ Mobile responsive

---

## 🆘 Help chahiye?
Koi problem ho toh Claude se poochho!
