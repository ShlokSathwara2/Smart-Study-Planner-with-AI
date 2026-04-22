# Gemini API Migration Status

## ✅ Completed

1. **Install Gemini SDK** - `@google/generative-ai` installed
2. **Create aiClient.ts** - Centralized AI utility created
3. **Update .env** - Replaced ANTHROPIC_API_KEY with GEMINI_API_KEY
4. **syllabus.ts** - Migrated to Gemini (analyzeWithGemini function)

## 🔄 Remaining Files to Migrate

### Routes (7 files):
- [ ] `topicGraph.ts` - 1 Claude API call
- [ ] `studyPlan.ts` - 2 Claude API calls  
- [ ] `estimates.ts` - 1 Claude API call
- [ ] `cognitiveLoadAutoSplit.ts` - 1 Claude API call
- [ ] `gapDetector.ts` - 1 Claude API call
- [ ] `quiz.ts` - 1 Claude API call
- [ ] `voiceInput.ts` - Uses whisperTranscribe.ts (update intent parser)

### Utilities (4 files):
- [ ] `digitalTwinGenerator.ts` - 1 Claude API call (use gemini-2.0-flash)
- [ ] `examPredictor.ts` - 1 Claude API call (use gemini-2.0-flash)
- [ ] `studyStrategyGenerator.ts` - 1 Claude API call
- [ ] `whisperTranscribe.ts` - Replace intent parser (keep Whisper for audio)

### Configuration:
- [ ] `.env.example` - Update template with GEMINI_API_KEY
- [ ] `package.json` - Already updated with @google/generative-ai

## Migration Pattern

For each file, follow this pattern:

### Before (Claude):
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }),
});
const data = await response.json();
const result = data.content[0].text;
```

### After (Gemini):
```typescript
import { askAI } from '../utils/aiClient';
// OR for JSON:
import { askAIForJSON } from '../utils/aiClient';

// For text responses:
const result = await askAI(prompt);

// For JSON responses:
const result = await askAIForJSON(prompt);
```

## Next Steps
1. Update all remaining route files
2. Update all utility files
3. Update .env.example
4. Test all AI features
5. Commit and push
