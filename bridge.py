"""PTA Luna Bridge. Local-only OAuth client; no API key or Codex credential extraction."""
from __future__ import annotations
import argparse, base64, hashlib, hmac, html, json, os, re, secrets, socket, sys, threading, time, uuid, webbrowser
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
import jwt
import math, queue, shutil, subprocess
from itertools import chain

VERSION = '1.2.0'
ISSUER = 'https://auth.openai.com'
RESOURCE = 'https://api.openai.com/v1'
MODEL = 'gpt-6-luna'
SCOPE = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'
PLAN_SCOPE = 'chatgpt.tokens.use.direct'
# Verified from current official model pages. Unlisted models use their default
# rather than guessing which reasoning levels a future model accepts.
MODEL_EFFORTS = {
    'gpt-6-sol':['none','low','medium','high','xhigh','max'],
    'gpt-6-luna':['none','low','medium','high','xhigh','max'],
    'gpt-6.1-sol':['low','medium','high','xhigh','max'],
    'gpt-6-astra':['low','medium','high','xhigh','max'],
}
def model_efforts(model): return ['default']+MODEL_EFFORTS.get(model,[])
MAX_BODY = 36 * 1024 * 1024
TERMINAL_REFRESH = {'invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused'}

class BridgeError(Exception):
    def __init__(self, message, status=400, code='bridge_error', request_id=''):
        super().__init__(message); self.status=status; self.code=code; self.request_id=request_id
    def as_dict(self):
        return {'message': str(self), 'status': self.status, 'code': self.code, 'request_id': self.request_id}

def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode('ascii')
def unb64(s): return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))

def safe_diagnostic(value, secret_values=()):
    text=str(value)
    for secret in secret_values:
        if isinstance(secret,str) and len(secret)>6: text=text.replace(secret,'[已隐藏]')
    text=re.sub(r'Bearer\s+[^\s"<>]+','Bearer [已隐藏]',text,flags=re.I)
    text=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[JWT 已隐藏]',text)
    text=re.sub(r'sk-[A-Za-z0-9_-]+','[API Key 已隐藏]',text)
    text=re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}','[邮箱已隐藏]',text)
    return text[:500]

def upstream_problem(response, secret_values=(), raw_prefix=None):
    """Describe a rejected upstream response without exporting its raw body."""
    status=getattr(response,'status',None) or getattr(response,'code',None) or 200
    ctype=response.headers.get('Content-Type','未提供')
    rid=response.headers.get('x-request-id') or response.headers.get('openai-request-id','')
    raw=response.read(16384) if raw_prefix is None else raw_prefix[:16384]
    code='invalid_stream'; description=''
    try:
        data=json.loads(raw)
    except (ValueError,UnicodeError):
        lowered=raw.lstrip().lower()
        if b'<html' in lowered[:1024] or lowered.startswith(b'<!doctype html'):
            kind='HTML 网页'
            match=re.search(rb'<title[^>]*>(.*?)</title>',raw,re.I|re.S)
            if match: description='网页标题：'+html.unescape(match[1].decode('utf-8','replace'))
        elif not raw: kind='空响应'
        elif lowered.startswith((b'data:',b'event:')): kind='SSE 形态文本，但 Content-Type 不正确'
        else: kind='非 JSON 文本或二进制内容（未展示正文）'
    else:
        kind='JSON'
        if isinstance(data,dict):
            error=data.get('error')
            if isinstance(error,dict):
                code=error.get('code') or error.get('type') or code
                description=error.get('message') or error.get('param') or ''
            elif isinstance(error,str):
                code=error; description=data.get('error_description','')
            detail=data.get('detail')
            if not description and isinstance(detail,str): description=detail
            if not description and isinstance(detail,dict): description=detail.get('message') or detail.get('reason') or ''
            if not description: description='返回字段：'+', '.join(str(k) for k in list(data)[:12])
    meta=f'HTTP {status}；Content-Type: {ctype}；返回类型：{kind}'
    if rid: meta+='；Request ID: '+rid
    if description: meta+='\n上游说明：'+str(description)
    return BridgeError('上游未返回可接受的 SSE 流，已停止，未自动重发。\n'+safe_diagnostic(meta,secret_values),status if status>=400 else 502,safe_diagnostic(code,secret_values),safe_diagnostic(rid,secret_values))

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        raise BridgeError(f'官方接口返回 HTTP {code} 重定向；为避免转发登录凭据，未继续请求。请检查代理和接口配置。',502,'upstream_redirect')

def checked_sse_lines(response, secret_values=()):
    """Validate framing when a gateway omits or mislabels the MIME header.

    This does not accept a JSON success response or partial model output.
    collect_response still requires a terminal response.completed event.
    """
    media=response.headers.get('Content-Type','').split(';')[0].strip().lower()
    if media=='text/event-stream':
        yield from response
        return
    prefix=[]; size=0
    while size<65536:
        line=response.readline(65537-size)
        if not line: break
        prefix.append(line); size+=len(line)
        probe=line.removeprefix(b'\xef\xbb\xbf') if len(prefix)==1 else line
        probe=probe.strip(b'\r\n')
        if not probe: continue
        if probe.startswith((b'data:',b'event:',b':')):
            if len(prefix)==1: prefix[0]=line.removeprefix(b'\xef\xbb\xbf')
            if not line.endswith(b'\n'):
                prefix[-1]+=response.readline()
            yield from chain(prefix,response)
            return
        break
    raise upstream_problem(response,secret_values,b''.join(prefix))

def dpapi(data, decrypt=False):
    import ctypes
    from ctypes import wintypes
    class Blob(ctypes.Structure):
        _fields_=[('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_ubyte))]
    buf=ctypes.create_string_buffer(data); src=Blob(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte))); dst=Blob()
    lib=ctypes.windll.crypt32
    fn=lib.CryptUnprotectData if decrypt else lib.CryptProtectData
    fn.argtypes=[ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    fn.restype=wintypes.BOOL
    if not fn(ctypes.byref(src), None, None, None, None, 1, ctypes.byref(dst)):
        raise BridgeError('Windows 凭据加密或解密失败，请使用原 Windows 用户运行。', 500, 'credential_storage')
    try: return ctypes.string_at(dst.pbData, dst.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree.argtypes=[ctypes.c_void_p]
        ctypes.windll.kernel32.LocalFree(ctypes.cast(dst.pbData, ctypes.c_void_p))

class Store:
    def __init__(self, path):
        self.path=Path(path); self.path.mkdir(parents=True, exist_ok=True, mode=0o700)
        if os.name != 'nt': os.chmod(self.path, 0o700)
        self.file=self.path/'credentials.bin'
        self.data={}
        if self.file.exists():
            raw=self.file.read_bytes()
            if raw.startswith(b'DPAPI\n'):
                if os.name != 'nt': raise BridgeError('此凭据文件只能由原 Windows 用户解密。')
                raw=dpapi(raw[6:], True)
            elif raw.startswith(b'JSON\n'): raw=raw[5:]
            else: raise BridgeError('凭据文件格式损坏，未覆盖原文件。')
            self.data=json.loads(raw)
        self.data.setdefault('host_id', 'urn:uuid:'+str(uuid.uuid4()))
        self.data.setdefault('bridge_key', secrets.token_urlsafe(32))
        self.save()
    def save(self):
        raw=json.dumps(self.data, ensure_ascii=False).encode()
        raw=b'DPAPI\n'+dpapi(raw) if os.name=='nt' else b'JSON\n'+raw
        tmp=self.file.with_suffix('.tmp')
        fd=os.open(tmp, os.O_WRONLY|os.O_CREAT|os.O_TRUNC, 0o600)
        with os.fdopen(fd,'wb') as f: f.write(raw); f.flush(); os.fsync(f.fileno())
        os.replace(tmp,self.file)
        if os.name!='nt': os.chmod(self.file,0o600)

def lock_store(path):
    f=open(Path(path)/'runtime.lock','a+b'); f.seek(0); f.write(b'0'); f.flush(); f.seek(0)
    try:
        if os.name=='nt':
            import msvcrt
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(f, fcntl.LOCK_EX|fcntl.LOCK_NB)
    except OSError:
        f.close(); raise BridgeError('辅助程序已经启动；请使用已打开的窗口，勿重复启动。')
    return f

def verify_id_token(token, jwks, client_id, nonce=None, expected_subject=None):
    try:
        header=jwt.get_unverified_header(token)
        if header.get('crit'): raise ValueError('unsupported critical header')
        alg=header.get('alg')
        if alg not in ['RS256','ES256','EdDSA']: raise ValueError('unsupported signature algorithm')
        keys=[k for k in jwks['keys'] if k.get('kid')==header.get('kid')]
        if len(keys)!=1: raise ValueError('unknown or ambiguous key id')
        key=keys[0]
        if key.get('use','sig')!='sig' or key.get('alg',alg)!=alg: raise ValueError('key algorithm mismatch')
        public=jwt.PyJWK.from_dict(key,algorithm=alg).key
        claims=jwt.decode(token,public,algorithms=[alg],audience=client_id,issuer=ISSUER,leeway=5,options={'require':['sub','exp','iat','iss','aud']})
        audience=claims['aud']; audience=[audience] if isinstance(audience,str) else audience
        if len(audience)>1 and claims.get('azp')!=client_id: raise ValueError('authorized party mismatch')
        if not isinstance(claims.get('sub'),str) or not claims['sub']: raise ValueError('missing subject')
        if nonce is not None and not hmac.compare_digest(str(claims.get('nonce','')),nonce): raise ValueError('nonce mismatch')
        if expected_subject and claims['sub']!=expected_subject: raise ValueError('account mismatch')
        return claims
    except Exception as exc:
        raise BridgeError('ID Token 校验失败（签名、身份、有效期或 nonce 不匹配），未保存新凭据。',401,'identity_validation') from exc

class Client:
    def __init__(self, store, port):
        self.store=store; self.port=port; self.lock=threading.RLock(); self.pending={}; self.models_cache=None; self.last_login='已读取本地会话' if store.data.get('account',{}).get('access_token') else '尚未登录'; self.discovery=None
    def open(self, url, *, method='GET', obj=None, form=None, token=None, timeout=30):
        headers={'Accept':'text/event-stream' if url.endswith('/responses') else 'application/json','User-Agent':'PTALunaBridge/'+VERSION}
        body=None
        if obj is not None: body=json.dumps(obj,ensure_ascii=False).encode(); headers['Content-Type']='application/json'
        if form is not None: body=urlencode(form).encode(); headers['Content-Type']='application/x-www-form-urlencoded'
        if token: headers['Authorization']='Bearer '+token
        proxy=self.store.data.get('proxy','').strip()
        opener=build_opener(ProxyHandler({'http':proxy,'https':proxy}) if proxy else ProxyHandler(),NoRedirect())
        try:
            return opener.open(Request(url,data=body,headers=headers,method=method),timeout=timeout)
        except HTTPError as exc:
            sensitive=[token]+[self.store.data.get('account',{}).get(k) for k in ['access_token','refresh_token','id_token']]
            if form: sensitive.extend(form.get(k) for k in ['code','code_verifier','refresh_token','token'])
            problem=upstream_problem(exc,sensitive)
            # Error responses on OAuth/model endpoints are not expected to be SSE.
            problem.args=(str(problem).replace('上游未返回可接受的 SSE 流，已停止，未自动重发。','官方接口请求失败，未自动重发。'),)
            if problem.code=='invalid_stream': problem.code='http_'+str(exc.code)
            raise problem from None
        except (URLError, TimeoutError, OSError) as exc:
            raise BridgeError('连接 OpenAI 失败或超时。检查本地网络和代理设置；未自动重发请求。',502,'network_error') from exc
    def get_json(self,url,**kw):
        with self.open(url,**kw) as r:
            try: return json.load(r)
            except ValueError: raise BridgeError('官方接口未返回有效 JSON。',502,'invalid_json') from None
    def discover(self):
        if not self.discovery:
            doc=self.get_json(ISSUER+'/.well-known/openid-configuration')
            if doc.get('issuer')!=ISSUER: raise BridgeError('OpenID issuer 不匹配。',502,'discovery')
            for field in ['authorization_endpoint','token_endpoint','jwks_uri']:
                u=urlsplit(doc.get(field,''))
                if u.scheme!='https' or u.netloc!='auth.openai.com' or u.fragment: raise BridgeError('OpenID 端点校验失败。',502,'discovery')
            self.discovery=doc
        return self.discovery
    def start_login(self, reconsent=False):
        with self.lock:
            doc=self.discover(); record=self.store.data.get('account',{})
            state=secrets.token_urlsafe(32); verifier=secrets.token_urlsafe(64); nonce=secrets.token_urlsafe(32)
            callback=f'http://127.0.0.1:{self.port}/auth/callback'
            cid=record.get('client_id') or self.store.data.get('registration_id')
            p={'client_id':cid or 'dynamic_agent_client','ext_agent_host_id':self.store.data['host_id'],'response_type':'code','redirect_uri':callback,'scope':SCOPE,'resource':RESOURCE,'state':state,'nonce':nonce,'code_challenge_method':'S256','code_challenge':b64(hashlib.sha256(verifier.encode()).digest())}
            if not cid: p['agent_name_hint']='PTA Luna Bridge'
            if record.get('id_token'): p['id_token_hint']=record['id_token']
            if reconsent: p['prompt']='consent'
            # One pending transaction per process. It expires after ten minutes.
            self.pending={state:{'verifier':verifier,'nonce':nonce,'callback':callback,'created':time.time(),'client_id':cid,'subject':record.get('subject')}}
            self.last_login='等待浏览器登录授权'
            return doc['authorization_endpoint']+'?'+urlencode(p)
    def finish_login(self, query):
        def one(k):
            vals=query.get(k,[])
            if len(vals)>1: raise BridgeError('OAuth 回调参数重复，已拒绝。',400,'oauth_callback')
            return vals[0] if vals else ''
        state=one('state')
        with self.lock:
            pending=self.pending.pop(state,None)
            if not pending or time.time()-pending['created']>600: raise BridgeError('登录状态无效、过期或已使用，请重新登录。',400,'oauth_state')
            if one('error'): self.last_login='用户取消了授权'; raise BridgeError('授权未完成，请在管理页重新登录。',400,'oauth_declined')
            cid=one('client_id') or pending['client_id']
            if not cid or cid=='dynamic_agent_client' or (pending['client_id'] and cid!=pending['client_id']): raise BridgeError('OAuth client_id 不匹配或缺失。',400,'oauth_client')
            code=one('code')
            if not code: raise BridgeError('OAuth 回调缺少 code。')
            # Keep registration for a fresh OAuth attempt if the code exchange fails.
            self.store.data['registration_id']=cid; self.store.save()
            tokens=self.get_json(self.discover()['token_endpoint'],method='POST',form={'grant_type':'authorization_code','client_id':cid,'code':code,'code_verifier':pending['verifier'],'redirect_uri':pending['callback'],'resource':RESOURCE})
            jwks=self.get_json(self.discover()['jwks_uri'])
            identity=verify_id_token(tokens.get('id_token',''),jwks,cid,pending['nonce'],pending['subject'])
            self.accept_tokens(tokens,cid,identity)
            self.last_login='登录成功，订阅授权已启用' if PLAN_SCOPE in self.store.data['account']['scopes'] else '已登录，但未授权订阅使用；请点击重新授权'
            self.models_cache=None
    def accept_tokens(self,tokens,cid,identity,previous=None):
        if tokens.get('token_type','').lower()!='bearer' or not isinstance(tokens.get('access_token'),str): raise BridgeError('Token 响应不完整。',401,'token_response')
        try: expiry=float(tokens['expires_in'])
        except (KeyError,ValueError,TypeError): raise BridgeError('Token 有效期缺失。',401,'token_response')
        if expiry<=0: raise BridgeError('Token 已过期。',401,'token_response')
        scopes=tokens.get('scope')
        if scopes is None: scopes=' '.join((previous or {}).get('scopes',[]))
        record={'client_id':cid,'subject':identity['sub'],'email':identity.get('email',''),'issuer':ISSUER,'id_token':tokens.get('id_token') or (previous or {}).get('id_token',''),'access_token':tokens['access_token'],'refresh_token':tokens.get('refresh_token') or (previous or {}).get('refresh_token',''),'expires_at':time.time()+expiry,'scopes':scopes.split()}
        self.store.data['account']=record; self.store.save()
    def access_token(self):
        with self.lock:
            record=self.store.data.get('account',{})
            if not record.get('access_token'): raise BridgeError('请先在本地管理页登录 ChatGPT。',401,'login_required')
            if PLAN_SCOPE not in record.get('scopes',[]): raise BridgeError('已登录但没有订阅调用权限，请在管理页点击重新授权。',403,'plan_scope_missing')
            if record['expires_at']>time.time()+90: return record['access_token']
            if not record.get('refresh_token'): raise BridgeError('登录已过期，请重新登录。',401,'login_required')
            try:
                tokens=self.get_json(self.discover()['token_endpoint'],method='POST',form={'grant_type':'refresh_token','client_id':record['client_id'],'refresh_token':record['refresh_token'],'resource':RESOURCE})
            except BridgeError as exc:
                if exc.code in TERMINAL_REFRESH:
                    self.store.data['account']={k:v for k,v in record.items() if k not in ['access_token','refresh_token','id_token']}; self.store.save()
                raise
            identity={'sub':record['subject'],'email':record.get('email','')}
            if tokens.get('id_token'): identity=verify_id_token(tokens['id_token'],self.get_json(self.discover()['jwks_uri']),record['client_id'],expected_subject=record['subject'])
            self.accept_tokens(tokens,record['client_id'],identity,record)
            if PLAN_SCOPE not in self.store.data['account']['scopes']: raise BridgeError('续期后订阅权限缺失，请重新授权。',403,'plan_scope_missing')
            return self.store.data['account']['access_token']
    def models(self, force=False):
        with self.lock:
            if not force and self.models_cache and time.time()-self.models_cache[0]<60: return self.models_cache[1]
            data=self.get_json(RESOURCE+'/models',token=self.access_token())
            # SIWC catalog uses models[].slug, not the API-key catalog's data[].id.
            rows=data.get('models')
            if not isinstance(rows,list): raise BridgeError('订阅模型目录格式与官方文档不一致，未猜测模型权限。',502,'model_catalog')
            rows=[{'slug':r['slug'],'display_name':r.get('display_name',r['slug']),'reasoning_efforts':model_efforts(r['slug'])} for r in rows if isinstance(r,dict) and isinstance(r.get('slug'),str) and r.get('visibility')=='list']
            self.models_cache=(time.time(),rows); return rows
    def disconnect(self):
        with self.lock:
            record=self.store.data.get('account',{})
            if record.get('refresh_token'):
                endpoint=self.discover().get('revocation_endpoint','')
                u=urlsplit(endpoint)
                if u.scheme!='https' or u.netloc!='auth.openai.com': raise BridgeError('官方撤销端点缺失，未清除本地凭据。请在 ChatGPT 设置中断开应用。',502,'revoke_endpoint')
                with self.open(endpoint,method='POST',form={'token':record['refresh_token'],'token_type_hint':'refresh_token','client_id':record['client_id']}): pass
            self.store.data.pop('account',None); self.store.data.pop('registration_id',None); self.store.save(); self.models_cache=None; self.last_login='已退出并撤销会话'

def response_body(messages, model=MODEL, effort='low'):
    if not isinstance(model,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}',model): raise BridgeError('模型标识无效，请从账号模型目录选择。',400,'invalid_model')
    if effort not in model_efforts(model): raise BridgeError('此模型的该推理强度未确认支持，请选择模型默认或列表中的强度。',400,'invalid_effort')
    if not isinstance(messages,list) or not messages: raise BridgeError('messages 不能为空。')
    items=[]
    for m in messages:
        if not isinstance(m,dict): raise BridgeError('消息格式无效。')
        role=m.get('role'); role='developer' if role=='system' else role
        if role not in ['developer','user','assistant']: raise BridgeError('不支持的消息角色。')
        content=m.get('content')
        if content == '' and role == 'user': content='请按上述要求作答。'
        if isinstance(content,str): parts=[{'type':'output_text' if role=='assistant' else 'input_text','text':content}]
        elif isinstance(content,list):
            parts=[]
            for p in content:
                if p.get('type')=='text': parts.append({'type':'output_text' if role=='assistant' else 'input_text','text':str(p['text'])})
                elif p.get('type')=='image_url' and role=='user':
                    image=p.get('image_url',{}); url=image.get('url','')
                    if not url.startswith(('data:image/png;base64,','data:image/jpeg;base64,','data:image/webp;base64,','data:image/gif;base64,')): raise BridgeError('题图必须以支持格式的图片字节发送，不接受远程图片地址。')
                    parts.append({'type':'input_image','image_url':url,'detail':image.get('detail','auto')})
                else: raise BridgeError('不支持的消息内容。')
        else: raise BridgeError('消息缺少内容。')
        item={'type':'message','role':role,'content':parts}
        items.append(item)
    body={'model':model,'input':items,'store':False,'stream':True}
    if effort!='default': body['reasoning']={'effort':effort}
    return body

def sse_events(lines):
    data=[]
    for line in lines:
        if isinstance(line,bytes): line=line.decode('utf-8',errors='strict')
        line=line.rstrip('\r\n')
        if not line:
            if data:
                raw='\n'.join(data); data=[]
                if raw!='[DONE]': yield json.loads(raw)
        elif line.startswith('data:'): data.append(line[5:].lstrip(' '))
    if data:
        raw='\n'.join(data)
        if raw!='[DONE]': yield json.loads(raw)

def collect_response(lines, cancelled=lambda:False, on_delta=lambda text:None):
    text=[]; usage={}; completed=False
    for event in sse_events(lines):
        if cancelled(): raise BridgeError('请求已取消；已开始的推理仍可能产生用量。',409,'cancelled')
        kind=event.get('type')
        if kind=='response.output_text.delta': text.append(event.get('delta','')); on_delta(event.get('delta',''))
        elif kind=='response.completed':
            response=event.get('response',{})
            if response.get('status','completed')!='completed': raise BridgeError('响应没有成功完成。',502,'incomplete_response')
            usage=response.get('usage',{}) or {}; completed=True
            if not text:
                text=[p.get('text','') for item in response.get('output',[]) if item.get('type')=='message' for p in item.get('content',[]) if p.get('type')=='output_text']
            break
        elif kind in ['response.failed','response.incomplete','error']:
            error=event.get('response',{}).get('error') or event.get('error') or event
            code=error.get('code') or kind
            labels={'subscription_sharing_usage_limit_exceeded':'订阅或应用额度已达限制，请查看 ChatGPT 用量设置','subscription_sharing_usage_unavailable':'暂时无法确认订阅额度，请稍后手动重试','subscription_sharing_user_not_eligible':'当前账号或工作区不支持订阅调用','subscription_sharing_unsupported_capability':'当前模型或参数不受订阅调用支持'}
            raise BridgeError(labels.get(code,'推理未成功完成，未使用部分答案')+'（'+code+'）',429 if code=='subscription_sharing_usage_limit_exceeded' else 502,code)
    if not completed: raise BridgeError('流式连接中断，未收到 response.completed；未使用部分答案，未自动重发。',502,'stream_interrupted')
    raw=''.join(text).strip()
    if not raw: raise BridgeError('模型未返回文本答案。',502,'empty_output')
    return {'text':raw,'usage':usage}

class Jobs:
    def __init__(self, client): self.client=client; self.lock=threading.RLock(); self.serial=threading.Lock(); self.items={}; self.totals={'requests':0,'completed':0,'failed':0,'input_tokens':0,'output_tokens':0,'cached_tokens':0,'reasoning_tokens':0}; self.counter=0; self.blocked=None
    def create(self,data):
        model=data.get('model',MODEL)
        body=response_body(data.get('messages'),model,data.get('effort','low' if model==MODEL else 'default'))
        with self.lock:
            if self.blocked: raise BridgeError(self.blocked['message'],self.blocked['status'],self.blocked['code'],self.blocked.get('request_id',''))
            for k in list(self.items):
                if self.items[k]['state'] in ['done','failed','cancelled'] and time.time()-self.items[k]['created']>900: del self.items[k]
            if sum(x['state'] in ['queued','running'] for x in self.items.values())>=3: raise BridgeError('已有请求正在处理，请稍后再开始。',429,'local_busy')
            rid=data.get('request_id')
            if not isinstance(rid,str) or not 16<=len(rid)<=80: raise BridgeError('缺少有效 request_id。')
            if rid in self.items: return {'id':rid,'state':self.items[rid]['state']}
            self.items[rid]={'state':'queued','cancel':threading.Event(),'created':time.time(),'last_poll':time.time(),'response':None,'error':None,'chars':0,'upstream':None}
        threading.Thread(target=self.run,args=(rid,body),daemon=True).start(); return {'id':rid,'state':'queued'}
    def run(self,rid,body):
        job=self.items[rid]
        try:
            with self.serial:
                if job['cancel'].is_set(): raise BridgeError('请求已取消。',409,'cancelled')
                if self.blocked: raise BridgeError(self.blocked['message'],self.blocked['status'],self.blocked['code'])
                job['state']='running'
                if body['model'] not in [m['slug'] for m in self.client.models()]: raise BridgeError('账号目录中没有所选模型 '+body['model']+'；未切换到其他模型。',403,'model_not_available')
                token=self.client.access_token()
                if job['cancel'].is_set(): raise BridgeError('请求已取消。',409,'cancelled')
                with self.lock: self.totals['requests']+=1
                with self.client.open(RESOURCE+'/responses',method='POST',obj=body,token=token,timeout=60) as upstream:
                    job['upstream']=upstream
                    sensitive=[token]+[self.client.store.data.get('account',{}).get(k) for k in ['access_token','refresh_token','id_token']]
                    started=time.monotonic()
                    def lines():
                        for line in checked_sse_lines(upstream,sensitive):
                            if time.monotonic()-started>300: raise BridgeError('推理超过五分钟，已停止等待，未自动重试。',504,'deadline')
                            yield line
                    def progress(delta): job['chars']+=len(delta)
                    result=collect_response(lines(),job['cancel'].is_set,progress)
                    result.update(model=body['model'],effort=body.get('reasoning',{}).get('effort','default'))
                if job['cancel'].is_set(): raise BridgeError('请求已取消。',409,'cancelled')
                with self.lock:
                    job['response']=result; job['state']='done'; self.totals['completed']+=1
                    u=result['usage']; self.totals['input_tokens']+=u.get('input_tokens',0); self.totals['output_tokens']+=u.get('output_tokens',0)
                    self.totals['cached_tokens']+=(u.get('input_tokens_details') or {}).get('cached_tokens',0)
                    self.totals['reasoning_tokens']+=(u.get('output_tokens_details') or {}).get('reasoning_tokens',0)
        except Exception as exc:
            if job['cancel'].is_set(): exc=BridgeError('请求已取消；上游已经处理的内容可能仍计入用量。',409,'cancelled')
            if not isinstance(exc,BridgeError): exc=BridgeError('处理响应失败，未使用部分答案；请在管理页检查连接。',502,'processing_error')
            with self.lock:
                job['error']=exc.as_dict(); job['state']='cancelled' if exc.code=='cancelled' else 'failed'; self.totals['failed']+=1
                if exc.code!='cancelled': self.blocked=exc.as_dict()
                # Do not keep request content or partial output on disk.
        finally: job['upstream']=None
    def get(self,rid):
        with self.lock:
            job=self.items.get(rid)
            if not job: raise BridgeError('请求记录不存在或已过期，未自动重发。',404,'job_missing')
            job['last_poll']=time.time()
            return {'id':rid,'state':job['state'],'chars':job['chars'],'result':job['response'],'error':job['error']}
    def cancel(self,rid):
        with self.lock:
            job=self.items.get(rid)
            if job: job['cancel'].set()
            upstream=job.get('upstream') if job else None
        if upstream:
            # Closing an active response requests cancellation; not a refund guarantee.
            threading.Thread(target=upstream.close,daemon=True).start()
        return {'cancelled':bool(job)}
    def cancel_all(self):
        for rid in list(self.items):
            if self.items[rid]['state'] in ['queued','running']: self.cancel(rid)

class CodexRPC:
    """Read-only app-server client. Never exports or reads Codex auth files."""
    def __init__(self, executable):
        self.proc=subprocess.Popen([executable,'app-server','--listen','stdio://'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        self.messages=queue.Queue(); self.next_id=0
        def reader():
            try:
                for line in self.proc.stdout:
                    if len(line)>1048576: continue
                    try: self.messages.put(json.loads(line))
                    except ValueError: continue
            finally: self.messages.put(None)
        threading.Thread(target=reader,daemon=True).start()
    def send(self,value):
        self.proc.stdin.write(json.dumps(value)+'\n'); self.proc.stdin.flush()
    def rpc(self,method,params=None,timeout=10):
        self.next_id+=1; request_id=self.next_id
        self.send({'method':method,'id':request_id,**({'params':params} if params is not None else {})})
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            try: value=self.messages.get(timeout=max(.01,deadline-time.monotonic()))
            except queue.Empty: break
            if value is None: raise BridgeError('Codex app-server 已退出，请确认 CLI 版本支持账号查询。',503,'codex_exited')
            if value.get('id')!=request_id: continue
            if 'error' in value: raise BridgeError('Codex 查询失败：'+safe_diagnostic(value['error'].get('message','RPC error')),503,'codex_rpc')
            return value.get('result',{})
        raise BridgeError('Codex 账号查询超时；没有发出模型推理。',504,'codex_timeout')
    def close(self):
        try: self.proc.stdin.close()
        except (OSError,ValueError): pass
        if self.proc.poll() is None:
            if os.name=='nt':
                # npm's codex.cmd may own the native executable as a child.
                # Stop only the process tree created for this read-only query.
                try: subprocess.run(['taskkill','/PID',str(self.proc.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=3,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                except (OSError,subprocess.TimeoutExpired): pass
            if self.proc.poll() is None: self.proc.terminate()
            try: self.proc.wait(timeout=2)
            except subprocess.TimeoutExpired: self.proc.kill(); self.proc.wait(timeout=2)
        # The daemon reader owns stdout; avoid blocking a web request on its lock.

def quota_windows(result):
    buckets=result.get('rateLimitsByLimitId')
    if not isinstance(buckets,dict) or not buckets:
        single=result.get('rateLimits'); buckets={single.get('limitId') or 'codex':single} if isinstance(single,dict) else {}
    rows=[]
    for bucket_id,bucket in list(buckets.items())[:8]:
        if not isinstance(bucket,dict): continue
        for key in ['primary','secondary']:
            w=bucket.get(key)
            if not isinstance(w,dict): continue
            used=w.get('usedPercent')
            if type(used) not in [float,int] or not math.isfinite(used) or used<0: continue
            duration=w.get('windowDurationMins'); reset=w.get('resetsAt')
            rows.append({'bucket_id':str(bucket_id),'bucket_name':str(bucket.get('limitName') or bucket_id),'window':key,'used_percent':used,'remaining_percent':max(0,100-used),'window_minutes':duration if type(duration) in [int,float] and math.isfinite(duration) and duration>0 else None,'resets_at':reset if type(reset) in [int,float] and math.isfinite(reset) and reset>0 else None})
    return rows

class QuotaReader:
    def __init__(self,store): self.store=store; self.lock=threading.Lock(); self.last=None
    def read(self):
        with self.lock:
            expected=self.store.data.get('account',{}).get('email','').strip().lower()
            if expected and self.last and self.last['account_email'].lower()==expected and time.time()-self.last['checked_at']<15: return {**self.last,'cached':True}
            if not expected: raise BridgeError('请先登录辅助程序，才能核对额度查询账号。',401,'quota_account_unverified')
            executable=shutil.which('codex')
            if not executable: raise BridgeError('未在 PATH 检测到 Codex CLI。真实额度查询需安装 CLI 并用同一 ChatGPT 账号登录；也可点“打开官方用量页”。答题功能不受影响。',503,'codex_not_found')
            rpc=None
            try:
                rpc=CodexRPC(executable)
                rpc.rpc('initialize',{'clientInfo':{'name':'pta_quota_reader','title':'PTA quota reader','version':VERSION}})
                rpc.send({'method':'initialized'})
                account=rpc.rpc('account/read',{'refreshToken':False}).get('account')
                if not isinstance(account,dict) or account.get('type')!='chatgpt': raise BridgeError('Codex CLI 尚未使用 ChatGPT 登录。请先运行 codex login，并选择当前辅助程序使用的同一账号。',401,'codex_login_required')
                email=account.get('email','') or ''
                if email.strip().lower()!=expected: raise BridgeError('Codex CLI 登录账号与辅助程序账号不一致，未展示其他账号的额度。',409,'codex_account_mismatch')
                result=rpc.rpc('account/rateLimits/read')
                rows=quota_windows(result)
                if not rows: raise BridgeError('Codex 未返回可显示的额度窗口。不能据此认定为零额度或无限额度，请查看官方用量页。',503,'quota_unavailable')
                previous=self.last
                for row in rows:
                    row['change_pp']=None
                    if previous and previous['account_email'].lower()==email.lower() and row['resets_at'] is not None:
                        old=next((w for w in previous['windows'] if (w['bucket_id'],w['window'],w['resets_at'],w['window_minutes'])==(row['bucket_id'],row['window'],row['resets_at'],row['window_minutes'])),None)
                        if old: row['change_pp']=row['used_percent']-old['used_percent']
                self.last={'source':'codex-app-server','account_email':email,'plan_type':account.get('planType'),'checked_at':time.time(),'windows':rows,'cached':False,'workspace_verified':False,'note':'Codex CLI 账号整体额度；工作区未独立核验，可能包含其他应用使用，变化不等于本脚本单次消耗。'}
                return self.last
            except OSError as exc:
                raise BridgeError('无法启动 Codex CLI，请在终端确认 codex app-server 可用；答题功能不受影响。',503,'codex_start_failed') from exc
            finally:
                if rpc: rpc.close()

class Server(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address,store):
        super().__init__(address,Handler); self.store=store; self.client=Client(store,self.server_port); self.jobs=Jobs(self.client); self.quota=QuotaReader(store); self.admin=secrets.token_urlsafe(32)
        self.stopping=threading.Event()
        threading.Thread(target=self.watchdog,daemon=True).start()
    def watchdog(self):
        while not self.stopping.wait(5):
            with self.jobs.lock:
                expired=[rid for rid,j in self.jobs.items.items() if j['state'] in ['running','queued'] and time.time()-j['last_poll']>45]
            for rid in expired: self.jobs.cancel(rid)
    def server_close(self):
        if hasattr(self,'stopping'): self.stopping.set()
        super().server_close()

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass  # OAuth callback URLs and prompts must never be logged.
    def gate(self,admin=False):
        host=self.headers.get('Host','')
        if host!=f'127.0.0.1:{self.server.server_port}': raise BridgeError('无效 Host。',403,'host_rejected')
        origin=self.headers.get('Origin')
        if origin:
            o=urlsplit(origin)
            if not (origin==f'http://{host}' or (o.scheme=='https' and o.netloc=='pintia.cn') or o.scheme in ['chrome-extension','moz-extension']): raise BridgeError('来源不允许。',403,'origin_rejected')
        if admin is not None:
            wanted=self.server.admin if admin else self.server.store.data['bridge_key']
            if not hmac.compare_digest(self.headers.get('X-Bridge-Key',''),wanted): raise BridgeError('本机配对码错误；请从管理页复制配对码。',401,'pairing_required')
    def send(self,data,status=200,kind='application/json; charset=utf-8'):
        raw=json.dumps(data,ensure_ascii=False).encode() if kind.startswith('application/json') else data.encode('utf-8')
        self.send_response(status); self.send_header('Content-Type',kind); self.send_header('Content-Length',str(len(raw)))
        for k,v in {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}.items(): self.send_header(k,v)
        self.end_headers()
        try: self.wfile.write(raw)
        except (BrokenPipeError,ConnectionResetError): pass
    def body(self):
        if self.headers.get('Transfer-Encoding'): raise BridgeError('不支持分块请求。',400)
        if self.headers.get('Content-Type','').split(';')[0]!='application/json': raise BridgeError('需要 JSON 请求。',415)
        try: length=int(self.headers.get('Content-Length','0'))
        except ValueError: raise BridgeError('无效长度。')
        if not 0<length<=MAX_BODY: raise BridgeError('请求为空或过大。',413)
        self.connection.settimeout(15)
        try: value=json.loads(self.rfile.read(length))
        except (ValueError,TimeoutError): raise BridgeError('请求不是完整 JSON。')
        if not isinstance(value,dict): raise BridgeError('需要 JSON 对象。')
        return value
    def do_GET(self):
        try:
            self.gate(None); path=urlsplit(self.path).path
            if path=='/': return self.send((Path(__file__).parent/'manager.html').read_text(encoding='utf-8'),kind='text/html; charset=utf-8')
            if path=='/auth/callback':
                try: self.server.client.finish_login(parse_qs(urlsplit(self.path).query,keep_blank_values=True))
                except BridgeError as exc:
                    self.server.client.last_login=str(exc); return self.send('<meta charset="utf-8"><h2>登录未完成</h2><p>'+html.escape(str(exc))+'</p><p>返回本地管理页处理，无需粘贴任何 Token。</p>',exc.status,'text/html; charset=utf-8')
                return self.send('<meta charset="utf-8"><h2>登录流程已完成</h2><p>返回本地管理页，查看授权状态并测试所选模型。</p>',kind='text/html; charset=utf-8')
            self.gate(path.startswith('/admin/'))
            if path in ['/status','/admin/status']:
                a=self.server.store.data.get('account',{})
                data={'version':VERSION,'logged_in':bool(a.get('access_token')),'plan_enabled':PLAN_SCOPE in a.get('scopes',[]),'login_status':self.server.client.last_login,'model':MODEL,'effort':'low','usage':self.server.jobs.totals.copy(),'blocked':self.server.jobs.blocked}
                if path.startswith('/admin/'): data.update(bridge_key=self.server.store.data['bridge_key'],email=a.get('email',''),proxy=self.server.store.data.get('proxy',''),port=self.server.server_port)
                return self.send(data)
            if path in ['/quota','/admin/quota']: return self.send(self.server.quota.read())
            if path in ['/models','/admin/models']: return self.send({'models':self.server.client.models(force=True)})
            if path.startswith('/jobs/'): return self.send(self.server.jobs.get(path.split('/')[-1]))
            raise BridgeError('页面不存在。',404)
        except BridgeError as exc: self.send({'error':exc.as_dict()},exc.status)
        except Exception: self.send({'error':{'message':'本地处理失败，未输出敏感内容。','code':'internal_error'}},500)
    def do_POST(self):
        try:
            path=urlsplit(self.path).path; self.gate(path.startswith('/admin/')); data=self.body()
            if path=='/admin/login': return self.send({'url':self.server.client.start_login(bool(data.get('reconsent')))})
            if path=='/admin/logout': self.server.jobs.cancel_all(); self.server.client.disconnect(); return self.send({'ok':True})
            if path=='/admin/reset':
                if any(x['state'] in ['running','queued'] for x in self.server.jobs.items.values()): raise BridgeError('先停止正在执行的任务，再解除暂停。',409)
                self.server.jobs.blocked=None; return self.send({'ok':True})
            if path=='/admin/proxy':
                proxy=str(data.get('proxy','')).strip()
                if proxy:
                    p=urlsplit(proxy)
                    if p.scheme not in ['http','https'] or not p.hostname or p.username or p.password or p.path not in ['', '/'] or p.query or p.fragment: raise BridgeError('请填写 http://127.0.0.1:端口，留空则跟随系统代理。')
                with self.server.client.lock:
                    self.server.store.data['proxy']=proxy; self.server.store.save(); self.server.client.discovery=None; self.server.client.models_cache=None
                return self.send({'ok':True})
            if path=='/admin/test':
                self.server.jobs.blocked=None
                model=data.get('model',MODEL)
                return self.send(self.server.jobs.create({'request_id':'selftest-'+secrets.token_hex(16),'model':model,'effort':data.get('effort','low' if model==MODEL else 'default'),'messages':[{'role':'user','content':'Reply with exactly OK.'}]}),202)
            if path=='/admin/test-result': return self.send(self.server.jobs.get(str(data.get('id',''))))
            if path=='/jobs': return self.send(self.server.jobs.create(data),202)
            if path.startswith('/jobs/') and path.endswith('/cancel'): return self.send(self.server.jobs.cancel(path.split('/')[2]))
            raise BridgeError('接口不存在。',404)
        except BridgeError as exc: self.send({'error':exc.as_dict()},exc.status)
        except Exception: self.send({'error':{'message':'本地处理失败，未输出敏感内容。','code':'internal_error'}},500)

def main():
    p=argparse.ArgumentParser(); p.add_argument('--port',type=int,default=1455); p.add_argument('--data-dir'); p.add_argument('--no-browser',action='store_true'); args=p.parse_args()
    if not 1024<=args.port<=65535: p.error('port must be between 1024 and 65535')
    base=Path(args.data_dir) if args.data_dir else (Path(os.environ.get('LOCALAPPDATA',str(Path.home()/'.local/share')))/'PTALunaBridge')
    base.mkdir(parents=True,exist_ok=True,mode=0o700); runtime_lock=lock_store(base)
    store=Store(base)
    try: server=Server(('127.0.0.1',args.port),store)
    except OSError: raise BridgeError(f'本机端口 {args.port} 已被占用。请关闭旧窗口，或修改 start-windows.cmd 中的 --port，并在脚本设置中使用相同端口。') from None
    print(f'PTA Bridge {VERSION} — manual model selection (default: Luna / low)',flush=True)
    print('Keep this window open. Close with Ctrl+C. OAuth tokens stay on this computer.',flush=True)
    url=f'http://127.0.0.1:{server.server_port}/#'+server.admin
    if args.no_browser: print('Manager (local session secret, do not share): '+url,flush=True)
    else:
        print('Opening local manager. If no browser opens, restart with --no-browser.',flush=True)
        webbrowser.open(url)
    try: server.serve_forever(poll_interval=.3)
    except KeyboardInterrupt: pass
    finally: server.jobs.cancel_all(); server.server_close(); runtime_lock.close()

if __name__=='__main__':
    try: main()
    except BridgeError as exc: print('ERROR: '+str(exc),file=sys.stderr); sys.exit(1)
