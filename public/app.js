'use strict';
const form=document.getElementById('chat-form');
const input=document.getElementById('prompt');
const send=document.getElementById('send');
const welcome=document.getElementById('welcome');
const list=document.getElementById('messages');
const scroll=document.getElementById('chat-scroll');
const errorBox=document.getElementById('error');
const status=document.getElementById('status');
const newChat=document.getElementById('new-chat');
let history=[];
let busy=false;
let nextSendAt=0;
function updateStatus(){
  const remaining=Math.max(0,Math.ceil((nextSendAt-Date.now())/1000));
  send.disabled=busy||remaining>0;
  newChat.disabled=busy;
  status.textContent=busy?'ИИ готовит ответ…':remaining>0?`Бесплатный API · следующий запрос через ${remaining} сек.`:'Бесплатный API · пауза между запросами — 45 секунд';
}
setInterval(updateStatus,1000);
function bottom(){scroll.scrollTop=scroll.scrollHeight;}
function message(role,text,pending=false){
  const row=document.createElement('article');row.className=`message ${role}`;
  const icon=document.createElement('div');icon.className='message-icon';icon.textContent=role==='user'?'ВЫ':'✳';icon.setAttribute('aria-hidden','true');
  const main=document.createElement('div');main.className='message-main';
  const meta=document.createElement('div');meta.className='message-meta';meta.textContent=role==='user'?'Вы':'Nexus';
  const detail=document.createElement('small');detail.textContent=role==='user'?'Сейчас':'Pollinations · AI';meta.append(detail);
  const body=document.createElement('div');body.className='message-text';
  if(pending){body.classList.add('typing');for(let i=0;i<3;i++)body.append(document.createElement('i'));const label=document.createElement('span');label.textContent='Думаю над ответом';body.append(label);}else body.textContent=text;
  main.append(meta,body);row.append(icon,main);list.append(row);bottom();return {row,body};
}
async function submit(event){
  event?.preventDefault();
  if(busy||Date.now()<nextSendAt)return;
  const text=input.value.trim();if(!text)return;
  errorBox.hidden=true;
  const context=history.slice(-10);
  while(context.reduce((sum,m)=>sum+m.content.length,0)+text.length>20000&&context.length)context.splice(0,2);
  const messages=[...context,{role:'user',content:text}];
  welcome.hidden=true;message('user',text);input.value='';input.style.height='40px';
  const pending=message('assistant','',true);busy=true;updateStatus();
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages}),signal:AbortSignal.timeout(75000)});
    const data=await response.json();
    if(data.retryAfter)nextSendAt=Date.now()+data.retryAfter*1000;
    if(!response.ok)throw new Error(data.error||'Не удалось получить ответ.');
    if(typeof data.reply!=='string'||!data.reply.trim())throw new Error('ИИ вернул пустой ответ.');
    pending.body.classList.remove('typing');pending.body.textContent=data.reply;
    history=[...messages,{role:'assistant',content:data.reply.slice(0,4000)}];
  }catch(error){
    pending.row.remove();
    if(!nextSendAt||nextSendAt<Date.now())nextSendAt=Date.now()+45000;
    errorBox.textContent=error.name==='TimeoutError'?'ИИ не ответил вовремя. Повторите запрос после паузы.':error.message||'Ошибка соединения. Попробуйте ещё раз.';
    errorBox.hidden=false;
    input.value=text;
    // A failed turn is removed so the screen and transmitted conversation remain aligned.
    list.lastElementChild?.remove();
    if(!list.children.length)welcome.hidden=false;
  }finally{busy=false;updateStatus();bottom();input.focus();}
}
form.addEventListener('submit',submit);
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!send.disabled)form.requestSubmit();}});
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(140,input.scrollHeight)+'px';});
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{if(busy)return;input.value=button.dataset.prompt;input.focus();}));
newChat.addEventListener('click',()=>{if(busy)return;history=[];list.replaceChildren();welcome.hidden=false;errorBox.hidden=true;input.value='';input.style.height='40px';input.focus();});
updateStatus();
