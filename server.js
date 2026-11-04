'use strict';
const express = require('express');
const path = require('node:path');
const app = express();
const port = Number(process.env.PORT) || 3000;
const endpoint = 'https://text.pollinations.ai/openai';
const cooldownMs = 45_000;
let nextRequestAt = 0;
let active = false;

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({error:'Запросы разрешены только с этой страницы.'});
  next();
});
app.use(express.json({limit:'32kb'}));
app.get('/api/health', (req, res) => res.json({ok:true, version:'2.0.0', provider:'Pollinations', cooldownSeconds:45}));
app.post('/api/chat', async (req, res) => {
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12 ||
      messages.some((m, i) => !m || m.role !== (i % 2 === 0 ? 'user' : 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 4000) ||
      messages.at(-1).role !== 'user' || messages.reduce((sum,m) => sum+m.content.length,0) > 20000) {
    return res.status(400).json({error:'Некорректный диалог. Начните новый чат или сократите сообщение (до 4000 символов).'});
  }
  if (active || Date.now() < nextRequestAt) {
    const retryAfter = Math.max(1, Math.ceil((nextRequestAt-Date.now())/1000));
    res.setHeader('Retry-After',String(retryAfter));
    return res.status(429).json({error:'У бесплатного API есть пауза между ответами. Пожалуйста, подождите.',retryAfter});
  }
  active = true;
  nextRequestAt = Date.now()+cooldownMs;
  const started = Date.now();
  try {
    const response = await fetch(endpoint, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({
        messages:[{role:'system',content:'Ты — Nexus, полезный ИИ-помощник. Отвечай на языке пользователя, понятно и по существу. Помогай с DevOps, кодом и общими вопросами. Не утверждай, что выполнил команды, получил доступ к облаку или изменил сервер: у тебя нет таких инструментов. Не выдумывай факты. Обычно достаточно 2–6 предложений.'},...messages],
        stream:false
      }),
      signal:AbortSignal.timeout(65000)
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Invalid provider response'); }
    if (!response.ok) {
      if ([402,429].includes(response.status)) {
        const seconds = Number(response.headers.get('retry-after')) || Number(data.error?.message?.match(/Retry after (\d+)s/i)?.[1]) || 45;
        const retryAfter = Math.max(1, Math.min(300, seconds));
        nextRequestAt = Date.now()+retryAfter*1000;
        res.setHeader('Retry-After',String(retryAfter));
        return res.status(429).json({error:'Бесплатный API временно достиг лимита. Повторите запрос после паузы.',retryAfter});
      }
      throw new Error(`Provider HTTP ${response.status}`);
    }
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty provider answer');
    console.log(JSON.stringify({event:'chat_completed',provider:'Pollinations',durationMs:Date.now()-started}));
    res.json({reply,provider:'Pollinations',retryAfter:Math.max(0,Math.ceil((nextRequestAt-Date.now())/1000))});
  } catch (error) {
    console.error(JSON.stringify({event:'chat_failed',type:error.name}));
    res.status(502).json({error:'Сервис ИИ сейчас не ответил. Попробуйте ещё раз через минуту.',retryAfter:45});
  } finally { active = false; }
});
app.use(express.static(path.join(__dirname,'public'),{maxAge:0}));
app.use((req,res) => res.status(404).json({error:'Страница не найдена.'}));
app.use((error,req,res,next) => {
  const status = error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({error:status === 413 ? 'Слишком большой запрос.' : status === 400 ? 'Некорректный JSON.' : 'Ошибка сервера.'});
});
app.listen(port,'0.0.0.0',() => console.log(`Nexus AI listening on port ${port}`));
