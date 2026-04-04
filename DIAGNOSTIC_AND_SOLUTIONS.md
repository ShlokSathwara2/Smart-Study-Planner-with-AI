# Smart Study Planner - Issue Diagnostic & Solutions

## ✅ FIXES COMPLETED

### 1. **Missing Dashboard Pages (404 Errors)** - FIXED
Created 3 missing route pages:
- ✅ `/frontend/src/app/dashboard/schedule/page.tsx` - Study Schedule with CalendarTimeline
- ✅ `/frontend/src/app/dashboard/subjects/page.tsx` - Learning Map with KnowledgeGraph  
- ✅ `/frontend/src/app/dashboard/companion/page.tsx` - AI Strategy Chat + Digital Twin Profile

These pages now display instead of 404 errors when navigating from the left sidebar.

---

## 🔴 CRITICAL ISSUES REQUIRING YOUR ACTION

### 2. **Claude API Key Not Set** - BLOCKING ALL AI FEATURES
**File**: `backend/.env`  
**Current Value**: `ANTHROPIC_API_KEY=sk-ant-api03-replace-with-your-key` ← PLACEHOLDER!

**Impact**: 
- ❌ Generate Study Plan doesn't work
- ❌ AI Companion not responding
- ❌ Topic dependency analysis failing
- ❌ Digital Twin insights not generated

**Solution**:
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create/copy your actual API key
3. Update `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-v7-YOUR-REAL-KEY-HERE
   ```
4. Restart backend: `npm run dev` in the `backend/` folder

---

### 3. **MongoDB Connection Not Verified**
**File**: `backend/.env`  
**Current Value**: `MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/studyplanner`

**Solution** - Choose ONE:

#### Option A: Use MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/studyplanner?retryWrites=true&w=majority
   ```

#### Option B: Use Local MongoDB
1. Install MongoDB Community: https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/studyplanner
   ```

---

### 4. **Qdrant Vector Database** (Optional but recommended)
**File**: `backend/.env`  
**Current Value**: `QDRANT_URL=http://localhost:6333`

**Note**: If Qdrant is not running, the app falls back to MongoDB-based vectors (slower but works).

**To Enable Qdrant**:
1. Install Docker
2. Run: `docker run -p 6333:6333 qdrant/qdrant`
3. Ensure `backend/.env` has: `QDRANT_URL=http://localhost:6333`

---

## 📋 VERIFICATION CHECKLIST

After fixing the above, verify each step:

```bash
# 1. In backend/ folder
npm install  # Install dependencies if not done
npm run dev  # Start backend (should run on http://localhost:4000)

# 2. Check health endpoint
curl http://localhost:4000/health
# Should return: { "ok": true, "message": "Smart Study Planner API is running 🚀" }

# 3. In frontend/ folder  
npm install
npm run dev  # Should run on http://localhost:3000

# 4. In browser, test the flow:
# - Sign up / Sign in
# - Complete onboarding
# - Upload syllabus → Should extract text via OCR/PDF parsing
# - Click "Generate Study Plan" → Should call Claude API
# - Check AI Companion page → Should load strategy chat
```

---

## 🐛 EXPECTED BEHAVIOR (After Fixes)

### Upload Page Flow:
1. Upload syllabus (PDF/DOCX/Image/Manual)
2. System extracts topics
3. Click "Generate Study Plan" 
4. Claude generates 7-day study schedule ✅

### Navigation:
- Subjects → Learning Map (Knowledge Graph) ✅
- AI Companion → Strategy Chat + Digital Twin ✅
- Schedule → Calendar with study sessions ✅

### Data Flow:
- User Study Behavior → Digital Twin ✅
- Digital Twin → Personalized AI Responses ✅
- AI Plans + Cognitive Load → Adaptive Study Strategy ✅

---

## 🆘 Troubleshooting

### "Failed to generate plan" Error
- Check: `ANTHROPIC_API_KEY` is valid in `.env`
- Check: Topic graph exists (uploaded syllabus → auto-creates graph)
- Check: Backend logs for API errors

### "Plan not found" Error  
- Check: Syllabus was uploaded successfully
- Check: `/api/graph/from-syllabus` was called after upload
- Check: MongoDB is connected and has data

### 404 Errors on Navigation
- ✅ FIXED - All pages now exist

### Components Not Loading (Cognitive Load, Voice Log, etc.)
- These components exist but need page routes
- Will integrate in next phase once core flow works

---

## 📁 Key Files Modified/Created

**Created (Frontend Routes)**:
- `frontend/src/app/dashboard/schedule/page.tsx`
- `frontend/src/app/dashboard/subjects/page.tsx`
- `frontend/src/app/dashboard/companion/page.tsx`

**Need Configuration**:
- `backend/.env` → Update ANTHROPIC_API_KEY
- `backend/.env` → Update MONGODB_URI

---

## 🚀 Next Steps (After Fixing Above)

1. **Test Core Flow**: Syllabus Upload → Generate Plan → View Schedule
2. **Test AI Features**: Click AI Companion → Test chat with Claude
3. **Test Digital Twin**: Check profile page for personalized insights
4. **Monitor Logs**: Backend logs should show Claude API calls

Once core features work, we can:
- Integrate remaining components
- Add Cognitive Load tracking
- Add Voice input logging
- Fix any remaining issues

