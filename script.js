// ===== THEME =====
(function(){
  const t=document.querySelector('[data-theme-toggle]'),r=document.documentElement;
  let d=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  r.setAttribute('data-theme',d);
  const sun='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  function upd(){t.innerHTML=d==='dark'?sun:moon;t.setAttribute('aria-label','Modo '+(d==='dark'?'claro':'escuro'));}
  upd();
  t.addEventListener('click',()=>{d=d==='dark'?'light':'dark';r.setAttribute('data-theme',d);upd();});
})();

// ===== TOAST =====
function toast(msg,type='success'){
  const c=document.getElementById('toast-container');
  const el=document.createElement('div');
  el.className='toast '+type;
  const icon=type==='success'
    ?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    :'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  el.innerHTML=icon+msg;
  c.appendChild(el);
  setTimeout(()=>{el.style.animation='toastOut .3s ease forwards';setTimeout(()=>el.remove(),300);},2500);
}

// ===== INDEXEDDB =====
const DB_NAME='carometro_db';
const DB_VERSION=1;
const STORE='students';
let db=null;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE,{keyPath:'id'});
      }
    };
    req.onsuccess=e=>{resolve(e.target.result);};
    req.onerror=e=>{reject(e.target.error);};
  });
}

function dbGetAll(){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

function dbPut(record){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    const req=tx.objectStore(STORE).put(record);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

function dbDelete(id){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    const req=tx.objectStore(STORE).delete(id);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

// ===== STATE =====
// Each student: { id, name, photoBlob (Blob|null), photoURL (transient blob URL) }
let students=[];
let editingId=null;
let viewingId=null;
let pendingDeleteId=null;
let tempPhotoBlob=null;  // new blob from file input
let tempPhotoURL=null;   // blob URL for preview

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function initials(name){return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');}
function makeBlobURL(blob){return blob?URL.createObjectURL(blob):null;}

// ===== DB STATUS =====
function setDbStatus(state,text){
  const dot=document.getElementById('db-dot');
  const label=document.getElementById('db-label');
  dot.className='db-dot '+state;
  label.textContent=text;
}

// ===== LOAD FROM DB =====
async function loadFromDB(){
  try {
    db=await openDB();
    setDbStatus('','IndexedDB ativo');
    const rows=await dbGetAll();
    // Sort by name
    rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    // Create blob URLs for display
    students=rows.map(r=>({
      ...r,
      photoURL:makeBlobURL(r.photoBlob)
    }));
    renderGrid();
  } catch(err){
    setDbStatus('error','Erro no banco');
    console.error('IndexedDB error:',err);
    toast('Erro ao abrir o banco de dados local.','error');
  }
}

// ===== RENDER =====
function renderGrid(){
  const q=document.getElementById('search-input').value.trim().toLowerCase();
  const filtered=q?students.filter(s=>s.name.toLowerCase().includes(q)):students;
  const grid=document.getElementById('students-grid');
  const badge=document.getElementById('count-badge');
  const total=students.length;
  badge.textContent=q
    ?`${filtered.length} de ${total} aluno${total!==1?'s':''}`
    :`${total} aluno${total!==1?'s':''}`;

  if(filtered.length===0){
    grid.innerHTML=`<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      <h3>${q?'Nenhum resultado':'Nenhum aluno cadastrado'}</h3>
      <p>${q?'Tente outro termo de busca.':'Clique em "Novo Aluno" para começar o carômetro.'}</p>
      ${!q?'<button class="btn btn-primary" onclick="openAddModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Adicionar Aluno</button>':''}
    </div>`;
    return;
  }
  grid.innerHTML=filtered.map((s,i)=>`
    <div class="student-card" style="animation-delay:${Math.min(i,12)*.03}s" data-id="${s.id}">
      <div class="card-photo">
        ${s.photoURL
          ?`<img src="${s.photoURL}" alt="Foto de ${s.name}" loading="lazy">`
          :`<div class="photo-initials"><span>${initials(s.name)}</span></div>`}
      </div>
      <div class="card-body">
        <div class="card-name" title="${s.name}">${s.name}</div>
        <div class="card-actions">
          <button class="btn btn-ghost" onclick="openView('${s.id}')" aria-label="Ver ${s.name}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Ver
          </button>
          <button class="btn btn-primary" onclick="openEdit('${s.id}')" aria-label="Editar ${s.name}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== ADD / EDIT MODAL =====
function resetAddForm(){
  editingId=null; tempPhotoBlob=null; tempPhotoURL=null;
  document.getElementById('name-input').value='';
  document.getElementById('photo-input').value='';
  document.getElementById('photo-preview').style.display='none';
  document.getElementById('photo-preview').src='';
  document.getElementById('photo-placeholder').style.display='flex';
  document.getElementById('name-error').style.display='none';
  document.getElementById('modal-add-title').textContent='Novo Aluno';
  document.getElementById('modal-add-save').textContent='Salvar';
}

function openAddModal(){
  resetAddForm();
  document.getElementById('modal-add').classList.add('open');
  setTimeout(()=>document.getElementById('name-input').focus(),100);
}

function openEdit(id){
  const s=students.find(x=>x.id===id);
  if(!s)return;
  resetAddForm();
  editingId=id;
  document.getElementById('modal-add-title').textContent='Editar Aluno';
  document.getElementById('modal-add-save').textContent='Atualizar';
  document.getElementById('name-input').value=s.name;
  if(s.photoBlob){
    tempPhotoBlob=s.photoBlob;
    tempPhotoURL=s.photoURL;
    document.getElementById('photo-preview').src=s.photoURL;
    document.getElementById('photo-preview').style.display='block';
    document.getElementById('photo-placeholder').style.display='none';
  }
  document.getElementById('modal-view').classList.remove('open');
  document.getElementById('modal-add').classList.add('open');
  setTimeout(()=>document.getElementById('name-input').focus(),100);
}

function closeAddModal(){document.getElementById('modal-add').classList.remove('open');}

document.getElementById('btn-add-open').addEventListener('click',openAddModal);
document.getElementById('modal-add-close').addEventListener('click',closeAddModal);
document.getElementById('modal-add-cancel').addEventListener('click',closeAddModal);
document.getElementById('modal-add').addEventListener('click',e=>{if(e.target===e.currentTarget)closeAddModal();});

document.getElementById('photo-input').addEventListener('change',function(){
  const file=this.files[0];if(!file)return;
  if(tempPhotoURL&&tempPhotoURL.startsWith('blob:')&&tempPhotoBlob!==students.find(x=>x.id===editingId)?.photoBlob)
    URL.revokeObjectURL(tempPhotoURL);
  tempPhotoBlob=file;
  tempPhotoURL=URL.createObjectURL(file);
  const p=document.getElementById('photo-preview');
  p.src=tempPhotoURL; p.style.display='block';
  document.getElementById('photo-placeholder').style.display='none';
});

document.getElementById('modal-add-save').addEventListener('click',saveStudent);
document.getElementById('name-input').addEventListener('keydown',e=>{if(e.key==='Enter')saveStudent();});

async function saveStudent(){
  const name=document.getElementById('name-input').value.trim();
  if(!name){
    document.getElementById('name-error').style.display='block';
    document.getElementById('name-input').focus(); return;
  }
  document.getElementById('name-error').style.display='none';
  if(!db){toast('Banco de dados não disponível.','error');return;}

  try {
    if(editingId){
      const s=students.find(x=>x.id===editingId);
      if(s){
        // revoke old URL if new photo
        if(tempPhotoBlob!==s.photoBlob&&s.photoURL)URL.revokeObjectURL(s.photoURL);
        s.name=name;
        if(tempPhotoBlob!==s.photoBlob){s.photoBlob=tempPhotoBlob;s.photoURL=tempPhotoURL;}
        await dbPut({id:s.id,name:s.name,photoBlob:s.photoBlob});
        toast('Aluno atualizado!');
      }
    } else {
      const newStudent={id:uid(),name,photoBlob:tempPhotoBlob,photoURL:tempPhotoURL};
      students.push(newStudent);
      students.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
      await dbPut({id:newStudent.id,name:newStudent.name,photoBlob:newStudent.photoBlob});
      toast('Aluno cadastrado!');
    }
    closeAddModal();
    renderGrid();
  } catch(err){
    console.error(err);
    toast('Erro ao salvar. Tente novamente.','error');
  }
}

// ===== VIEW MODAL =====
function openView(id){
  viewingId=id;
  const s=students.find(x=>x.id===id);if(!s)return;
  const body=document.getElementById('modal-view-body');
  body.innerHTML=(s.photoURL
    ?`<img class="view-photo" src="${s.photoURL}" alt="Foto de ${s.name}">`
    :`<div class="view-photo-initials">${initials(s.name)}</div>`)
    +`<div class="view-name" id="modal-view-name">${s.name}</div>`;
  document.getElementById('modal-view').classList.add('open');
}

function closeView(){document.getElementById('modal-view').classList.remove('open');}
document.getElementById('modal-view-close').addEventListener('click',closeView);
document.getElementById('modal-view-ok').addEventListener('click',closeView);
document.getElementById('modal-view').addEventListener('click',e=>{if(e.target===e.currentTarget)closeView();});
document.getElementById('modal-view-edit').addEventListener('click',()=>openEdit(viewingId));
document.getElementById('modal-view-delete').addEventListener('click',()=>{
  pendingDeleteId=viewingId;
  const s=students.find(x=>x.id===pendingDeleteId);
  if(s)document.getElementById('confirm-student-name').textContent=s.name;
  document.getElementById('modal-view').classList.remove('open');
  document.getElementById('modal-confirm').classList.add('open');
});

// ===== CONFIRM DELETE =====
function closeConfirm(){document.getElementById('modal-confirm').classList.remove('open');}
document.getElementById('modal-confirm-close').addEventListener('click',closeConfirm);
document.getElementById('modal-confirm-cancel').addEventListener('click',closeConfirm);
document.getElementById('modal-confirm').addEventListener('click',e=>{if(e.target===e.currentTarget)closeConfirm();});
document.getElementById('modal-confirm-ok').addEventListener('click',async()=>{
  if(!pendingDeleteId)return;
  const idx=students.findIndex(x=>x.id===pendingDeleteId);
  if(idx!==-1){
    const s=students[idx];
    if(s.photoURL)URL.revokeObjectURL(s.photoURL);
    students.splice(idx,1);
    try{
      await dbDelete(pendingDeleteId);
      toast('Aluno excluído.');
    } catch(err){
      console.error(err);
      toast('Erro ao excluir do banco.','error');
    }
  }
  pendingDeleteId=null;
  closeConfirm();
  renderGrid();
});

// ===== SEARCH =====
document.getElementById('search-input').addEventListener('input',renderGrid);

// ===== KEYBOARD =====
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeAddModal();closeView();closeConfirm();}
});

// ===== EXPOSE GLOBALS =====
window.openView=openView;
window.openEdit=openEdit;
window.openAddModal=openAddModal;

// ===== INIT =====
loadFromDB();
