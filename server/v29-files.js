import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const MAX_FILE_SIZE=10*1024*1024;
const ALLOWED=new Set([
  'image/jpeg','image/png','image/webp','application/pdf','text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_FILE_SIZE},fileFilter:(req,file,cb)=>cb(null,ALLOWED.has(file.mimetype))});

function assertActor(thread,actorType,actorId){
  const id=Number(actorId);
  return Number.isInteger(id)&&id>0&&(
    (actorType==='traveler'&&Number(thread.traveler_id)===id)||
    (actorType==='professional'&&Number(thread.professional_id)===id)
  );
}

export function registerV29FileRoutes({app,pool}){
  app.post('/api/v29/conversations/:threadId/files',upload.single('file'),async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),actorType=String(req.body?.actorType||''),actorId=Number(req.body?.actorId);
      if(!Number.isInteger(threadId)||threadId<=0)return res.status(400).json({error:'threadId_required'});
      if(!['traveler','professional'].includes(actorType)||!Number.isInteger(actorId)||actorId<=0)return res.status(400).json({error:'actor_invalid'});
      if(!req.file)return res.status(400).json({error:'file_required_or_type_not_allowed',allowedMimeTypes:[...ALLOWED],maxBytes:MAX_FILE_SIZE});
      const q=await pool.query('SELECT id,traveler_id,professional_id,status FROM traveler_professional_threads_v29 WHERE id=$1',[threadId]);
      if(!q.rows[0])return res.status(404).json({error:'thread_not_found'});
      if(q.rows[0].status!=='active')return res.status(409).json({error:'thread_closed'});
      if(!assertActor(q.rows[0],actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      const storageDir=path.resolve(process.env.V29_FILE_STORAGE_DIR||'uploads/v29');
      await fs.promises.mkdir(storageDir,{recursive:true});
      const storageKey=threadId+'/'+crypto.randomUUID();
      const target=path.join(storageDir,storageKey.replaceAll('/','_'));
      await fs.promises.writeFile(target,req.file.buffer);
      try{
        const f=await pool.query(
          'INSERT INTO traveler_professional_files_v29(thread_id,message_id,uploader_type,uploader_id,original_name,mime_type,size_bytes,storage_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,thread_id,message_id,uploader_type,original_name,mime_type,size_bytes,status,created_at',
          [threadId,req.body?.messageId?Number(req.body.messageId):null,actorType,actorId,req.file.originalname,req.file.mimetype,req.file.size,storageKey]
        );
        await pool.query('UPDATE traveler_professional_threads_v29 SET updated_at=now() WHERE id=$1',[threadId]);
        return res.status(201).json({version:'29.2',file:f.rows[0],privacy:{threadOnly:true,healthExcluded:true,identityProtected:true},principle:'files_stay_on_la_toile'});
      }catch(e){
        await fs.promises.rm(target,{force:true});
        throw e;
      }
    }catch(e){
      if(e instanceof multer.MulterError)return res.status(400).json({error:e.code==='LIMIT_FILE_SIZE'?'file_too_large':e.message,maxBytes:MAX_FILE_SIZE});
      res.status(500).json({error:e.message});
    }
  });

  app.get('/api/v29/conversations/:threadId/files',async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),actorType=String(req.query.actorType||''),actorId=Number(req.query.actorId);
      const q=await pool.query('SELECT id,traveler_id,professional_id,status FROM traveler_professional_threads_v29 WHERE id=$1',[threadId]);
      if(!q.rows[0])return res.status(404).json({error:'thread_not_found'});
      if(!['traveler','professional'].includes(actorType)||!assertActor(q.rows[0],actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      const f=await pool.query("SELECT id,thread_id,message_id,uploader_type,original_name,mime_type,size_bytes,status,created_at FROM traveler_professional_files_v29 WHERE thread_id=$1 AND status='available' ORDER BY created_at ASC,id ASC",[threadId]);
      res.json({version:'29.2',threadId,files:f.rows,privacy:{threadOnly:true,healthExcluded:true,identityProtected:true},principle:'files_stay_on_la_toile'});
    }catch(e){res.status(500).json({error:e.message})}
  });

  app.get('/api/v29/conversations/:threadId/files/:fileId',async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),fileId=Number(req.params.fileId),actorType=String(req.query.actorType||''),actorId=Number(req.query.actorId);
      const q=await pool.query('SELECT t.id,t.traveler_id,t.professional_id,f.original_name,f.mime_type,f.storage_key,f.status FROM traveler_professional_threads_v29 t JOIN traveler_professional_files_v29 f ON f.thread_id=t.id WHERE t.id=$1 AND f.id=$2',[threadId,fileId]);
      if(!q.rows[0])return res.status(404).json({error:'file_not_found'});
      if(!['traveler','professional'].includes(actorType)||!assertActor(q.rows[0],actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      if(q.rows[0].status!=='available')return res.status(410).json({error:'file_unavailable'});
      const storageDir=path.resolve(process.env.V29_FILE_STORAGE_DIR||'uploads/v29');
      const target=path.join(storageDir,q.rows[0].storage_key.replaceAll('/','_'));
      if(!fs.existsSync(target))return res.status(404).json({error:'file_storage_missing'});
      res.type(q.rows[0].mime_type).attachment(q.rows[0].original_name);
      fs.createReadStream(target).pipe(res);
    }catch(e){res.status(500).json({error:e.message})}
  });
}