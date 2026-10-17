import importlib.util, io, json, tempfile, threading, time, unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

spec=importlib.util.spec_from_file_location('bridge',Path(__file__).parents[1]/'bridge.py'); b=importlib.util.module_from_spec(spec); spec.loader.exec_module(b)

def stream(*events):
    return [line for ev in events for line in ('data: '+json.dumps(ev)+'\n','\n')]

def complete(text='OK'):
    return stream({'type':'response.output_text.delta','delta':text},{'type':'response.completed','response':{'status':'completed','usage':{'input_tokens':8,'output_tokens':2}}})

class ProtocolTests(unittest.TestCase):
    def test_message_and_images(self):
        body=b.response_body([{'role':'system','content':'solve'},{'role':'user','content':[{'type':'text','text':'question'},{'type':'image_url','image_url':{'url':'data:image/png;base64,AA==','detail':'high'}}]}])
        self.assertEqual(body['model'],'gpt-6-luna'); self.assertEqual(body['reasoning'],{'effort':'low'})
        self.assertEqual(body['input'][0]['role'],'developer'); self.assertEqual(body['input'][1]['content'][1]['type'],'input_image')
        self.assertFalse(body['store']); self.assertTrue(body['stream']); self.assertNotIn('temperature',body)
    def test_remote_image_rejected(self):
        with self.assertRaises(b.BridgeError): b.response_body([{'role':'user','content':[{'type':'image_url','image_url':{'url':'https://example.com/a.png'}}]}])
    def test_empty_original_user_message(self):
        body=b.response_body([{'role':'system','content':'题面'},{'role':'user','content':''}]); self.assertTrue(body['input'][1]['content'][0]['text'])
    def test_stream_completed(self):
        r=b.collect_response(complete('你好')); self.assertEqual(r['text'],'你好'); self.assertEqual(r['usage']['input_tokens'],8)
    def test_stream_no_completion(self):
        with self.assertRaises(b.BridgeError) as ctx: b.collect_response(stream({'type':'response.output_text.delta','delta':'partial'}))
        self.assertEqual(ctx.exception.code,'stream_interrupted')
    def test_limit_after_partial_output(self):
        with self.assertRaises(b.BridgeError) as ctx:
            b.collect_response(stream({'type':'response.output_text.delta','delta':'partial'},{'type':'response.failed','response':{'error':{'code':'subscription_sharing_usage_limit_exceeded'}}}))
        self.assertEqual(ctx.exception.status,429)
    def test_incomplete_and_refusal(self):
        for events in [stream({'type':'response.incomplete','response':{}}),stream({'type':'response.completed','response':{'status':'completed','output':[{'type':'message','content':[{'type':'refusal','refusal':'no'}]}]}})]:
            with self.assertRaises(b.BridgeError): b.collect_response(events)
    def test_multiline_sse_comments(self):
        self.assertEqual(list(b.sse_events([': heartbeat\r\n','data: {"type":\r\n','data: "ok"}\r\n','\r\n'])),[{'type':'ok'}])
    def test_cancel_drops_partial(self):
        with self.assertRaises(b.BridgeError) as ctx: b.collect_response(complete(),lambda:True)
        self.assertEqual(ctx.exception.code,'cancelled')

class IdentityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.private=rsa.generate_private_key(public_exponent=65537,key_size=2048); nums=cls.private.public_key().public_numbers()
        enc=lambda n:b.b64(n.to_bytes((n.bit_length()+7)//8,'big'))
        cls.keys={'keys':[{'kid':'test','kty':'RSA','alg':'RS256','n':enc(nums.n),'e':enc(nums.e)}]}
    def token(self,**overrides):
        claims={'iss':b.ISSUER,'aud':'oaiapp_test','sub':'person','iat':time.time()-2,'exp':time.time()+120,'nonce':'nonce'};claims.update(overrides)
        head=b.b64(json.dumps({'alg':'RS256','kid':'test'}).encode()); payload=b.b64(json.dumps(claims).encode()); signed=(head+'.'+payload).encode()
        return signed.decode()+'.'+b.b64(self.private.sign(signed,padding.PKCS1v15(),hashes.SHA256()))
    def test_valid(self): self.assertEqual(b.verify_id_token(self.token(),self.keys,'oaiapp_test','nonce')['sub'],'person')
    def test_claim_mismatches(self):
        for claims in [{'iss':'https://evil.invalid'},{'aud':'other'},{'exp':time.time()-60},{'nonce':'bad'},{'sub':''},{'iat':time.time()+60}]:
            with self.subTest(claims=claims), self.assertRaises(b.BridgeError): b.verify_id_token(self.token(**claims),self.keys,'oaiapp_test','nonce')
    def test_account_binding(self):
        with self.assertRaises(b.BridgeError): b.verify_id_token(self.token(),self.keys,'oaiapp_test',expected_subject='different')
    def test_signature_tampering(self):
        token=self.token(); parts=token.split('.'); parts[1]=b.b64(json.dumps({'sub':'hacked'}).encode())
        with self.assertRaises(b.BridgeError): b.verify_id_token('.'.join(parts),self.keys,'oaiapp_test','nonce')

class SessionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.store=b.Store(self.tmp.name);self.client=b.Client(self.store,1455)
        self.client.discovery={'issuer':b.ISSUER,'authorization_endpoint':b.ISSUER+'/api/accounts/authorize','token_endpoint':b.ISSUER+'/api/accounts/oauth/token','jwks_uri':b.ISSUER+'/.well-known/jwks.json'}
    def tearDown(self): self.tmp.cleanup()
    def account(self):
        self.store.data['account']={'client_id':'oaiapp_x','subject':'user','email':'','access_token':'old','refresh_token':'old-refresh','expires_at':0,'scopes':[b.PLAN_SCOPE]}
    def test_full_oauth_code_exchange_and_replay(self):
        IdentityTests.setUpClass(); identity=IdentityTests()
        query=b.parse_qs(b.urlsplit(self.client.start_login()).query)
        nonce=next(iter(self.client.pending.values()))['nonce']
        token=identity.token(nonce=nonce)
        tokens={'access_token':'new-access','refresh_token':'new-refresh','id_token':token,'token_type':'Bearer','expires_in':3600,'scope':b.SCOPE}
        with patch.object(self.client,'get_json',side_effect=[tokens,IdentityTests.keys]) as call:
            callback={'state':query['state'],'code':['single-use'],'client_id':['oaiapp_test']}
            self.client.finish_login(callback)
            self.assertEqual(call.call_args_list[0].kwargs['form']['client_id'],'oaiapp_test')
            self.assertEqual(call.call_args_list[0].kwargs['form']['redirect_uri'],'http://127.0.0.1:1455/auth/callback')
            self.assertEqual(self.store.data['account']['access_token'],'new-access')
            self.assertIn(b.PLAN_SCOPE,self.store.data['account']['scopes'])
            with self.assertRaises(b.BridgeError):self.client.finish_login(callback)
    def test_store_process_lock(self):
        f=b.lock_store(self.tmp.name)
        try:
            with self.assertRaises(b.BridgeError):b.lock_store(self.tmp.name)
        finally:f.close()
    def test_host_and_pair_persist(self):
        again=b.Store(self.tmp.name); self.assertEqual(again.data['host_id'],self.store.data['host_id']);self.assertEqual(again.data['bridge_key'],self.store.data['bridge_key'])
    def test_new_registration_and_pkce(self):
        url=self.client.start_login(); q=b.parse_qs(b.urlsplit(url).query);self.assertEqual(q['client_id'],['dynamic_agent_client']);self.assertEqual(q['redirect_uri'],['http://127.0.0.1:1455/auth/callback']);self.assertEqual(q['code_challenge_method'],['S256']);self.assertIn(b.PLAN_SCOPE,q['scope'][0]);self.assertNotIn('client_secret',q)
    def test_returning_client(self):
        self.account();q=b.parse_qs(b.urlsplit(self.client.start_login()).query);self.assertEqual(q['client_id'],['oaiapp_x']);self.assertNotIn('agent_name_hint',q)
    def test_replayed_state_rejected(self):
        with self.assertRaises(b.BridgeError) as ctx:self.client.finish_login({'state':['wrong'],'code':['x']})
        self.assertEqual(ctx.exception.code,'oauth_state')
    def test_decline_consumes_state(self):
        q=b.parse_qs(b.urlsplit(self.client.start_login()).query)
        with self.assertRaises(b.BridgeError):self.client.finish_login({'state':q['state'],'error':['access_denied']})
        self.assertFalse(self.client.pending)
    def test_client_mismatch_rejected(self):
        self.account();q=b.parse_qs(b.urlsplit(self.client.start_login()).query)
        with self.assertRaises(b.BridgeError) as ctx:self.client.finish_login({'state':q['state'],'client_id':['other'],'code':['x']})
        self.assertEqual(ctx.exception.code,'oauth_client')
    def test_scope_required(self):
        self.account();self.store.data['account']['scopes']=[]
        with self.assertRaises(b.BridgeError) as ctx:self.client.access_token()
        self.assertEqual(ctx.exception.code,'plan_scope_missing')
    def test_parallel_refresh_serialized(self):
        self.account(); calls=[]
        def get(url,**kwargs):
            calls.append(kwargs);time.sleep(.02);return {'access_token':'new','refresh_token':'rotated','token_type':'Bearer','expires_in':3600}
        with patch.object(self.client,'get_json',side_effect=get):
            out=[];threads=[threading.Thread(target=lambda:out.append(self.client.access_token())) for _ in range(3)]
            for t in threads:t.start()
            for t in threads:t.join()
        self.assertEqual(out,['new']*3);self.assertEqual(len(calls),1);self.assertNotIn('scope',calls[0]['form']);self.assertEqual(self.store.data['account']['refresh_token'],'rotated')
    def test_terminal_vs_temporary_refresh(self):
        self.account()
        with patch.object(self.client,'get_json',side_effect=b.BridgeError('temporary',503,'network_error')):
            with self.assertRaises(b.BridgeError):self.client.access_token()
        self.assertEqual(self.store.data['account']['refresh_token'],'old-refresh')
        with patch.object(self.client,'get_json',side_effect=b.BridgeError('expired',400,'invalid_grant')):
            with self.assertRaises(b.BridgeError):self.client.access_token()
        self.assertNotIn('refresh_token',self.store.data['account']);self.assertEqual(self.store.data['account']['client_id'],'oaiapp_x')

class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.server=b.Server(('127.0.0.1',0),b.Store(self.tmp.name)); self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.base=f'http://127.0.0.1:{self.server.server_port}'
    def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
    def req(self,path,method='GET',data=None,key=None,headers=None):
        h={'Content-Type':'application/json','X-Bridge-Key':key or self.server.store.data['bridge_key']};h.update(headers or {})
        r=Request(self.base+path,data=json.dumps(data).encode() if data is not None else None,headers=h,method=method)
        try:
            with urlopen(r,timeout=5) as f:return f.status,json.load(f)
        except HTTPError as e:return e.code,json.load(e)
    def test_occupied_port_is_clean_oserror(self):
        with self.assertRaises(OSError):b.Server(('127.0.0.1',self.server.server_port),self.server.store)
    def test_pair_and_admin_separate(self):
        self.assertEqual(self.req('/status',key='bad')[0],401);self.assertEqual(self.req('/status')[0],200);self.assertEqual(self.req('/admin/status')[0],401)
        code,d=self.req('/admin/status',key=self.server.admin);self.assertEqual(code,200);self.assertNotIn('access_token',json.dumps(d))
    def test_host_and_origin(self):
        self.assertEqual(self.req('/status',headers={'Host':'evil.invalid'})[0],403)
        self.assertEqual(self.req('/status',headers={'Origin':'https://evil.invalid'})[0],403)
        self.assertEqual(self.req('/status',headers={'Origin':'https://pintia.cn'})[0],200)
    def test_no_token_input_endpoint(self):self.assertEqual(self.req('/token','POST',{'access_token':'x'})[0],404)
    def test_exact_model(self):
        code,d=self.req('/jobs','POST',{'request_id':'abcdef0123456789','model':'bad/model','messages':[{'role':'user','content':'q'}]});self.assertEqual(code,400);self.assertEqual(d['error']['code'],'invalid_model')
    def test_end_to_end_mocked_upstream(self):
        class Fake(io.BytesIO):headers={'Content-Type':'text/event-stream'}
        payload=''.join(complete('int main() {return 0;}')).encode(); calls=[]
        def op(*args,**kw):calls.append((args,kw));return Fake(payload)
        with patch.object(self.server.client,'models',return_value=[{'slug':b.MODEL}]),patch.object(self.server.client,'access_token',return_value='local-test-only'),patch.object(self.server.client,'open',side_effect=op):
            request={'request_id':'test-0123456789abcdef','model':b.MODEL,'messages':[{'role':'system','content':'q'}]}
            self.assertEqual(self.req('/jobs','POST',request)[0],202)
            for _ in range(50):
                code,j=self.req('/jobs/'+request['request_id'])
                if j['state']=='done':break
                time.sleep(.01)
            self.assertEqual(j['state'],'done');self.assertIn('int main',j['result']['text'])
            self.req('/jobs','POST',request);self.assertEqual(len(calls),1);self.assertEqual(calls[0][1]['obj']['reasoning'],{'effort':'low'})
    def test_queued_cancel_never_calls_upstream(self):
        self.server.jobs.serial.acquire()
        request={'request_id':'cancel-0123456789abcdef','messages':[{'role':'user','content':'q'}]}
        try:
            with patch.object(self.server.client,'open') as upstream:
                self.req('/jobs','POST',request)
                self.req('/jobs/'+request['request_id']+'/cancel','POST',{})
                self.server.jobs.serial.release()
                for _ in range(50):
                    j=self.req('/jobs/'+request['request_id'])[1]
                    if j['state']=='cancelled':break
                    time.sleep(.01)
                self.assertEqual(j['state'],'cancelled');upstream.assert_not_called()
        finally:
            if self.server.jobs.serial.locked():self.server.jobs.serial.release()
    def test_upstream_error_blocks_new_requests(self):
        with patch.object(self.server.client,'models',side_effect=b.BridgeError('limit',429,'subscription_sharing_usage_limit_exceeded')):
            req={'request_id':'blocked-0123456789','messages':[{'role':'user','content':'q'}]};self.req('/jobs','POST',req)
            for _ in range(50):
                if self.server.jobs.blocked:break
                time.sleep(.01)
            req['request_id']='other-0123456789';code,d=self.req('/jobs','POST',req);self.assertEqual(code,429)
        self.assertEqual(self.req('/admin/reset','POST',{},key=self.server.admin)[0],200)


class DiagnosticTests(unittest.TestCase):
    class Response(io.BytesIO):
        def __init__(self,body,ctype='application/json',status=200):
            super().__init__(body);self.headers={'Content-Type':ctype,'x-request-id':'req-test'};self.status=status
    def test_json_detail_is_visible(self):
        e=b.upstream_problem(self.Response(b'{"detail":"direct route unavailable"}'))
        self.assertIn('HTTP 200',str(e));self.assertIn('application/json',str(e));self.assertIn('direct route unavailable',str(e))
    def test_real_error_code_is_preserved(self):
        e=b.upstream_problem(self.Response(b'{"error":{"code":"subscription_sharing_user_not_eligible","message":"not eligible"}}',status=403))
        self.assertEqual(e.code,'subscription_sharing_user_not_eligible');self.assertEqual(e.status,403)
    def test_html_title_not_whole_document(self):
        e=b.upstream_problem(self.Response(b'<html><title>Access denied</title><body>private text</body></html>','text/html'))
        self.assertIn('Access denied',str(e));self.assertNotIn('private text',str(e))
    def test_sensitive_tokens_redacted(self):
        body=json.dumps({'detail':'Bearer secret-token-a test@example.com sk-abcdef eyJabc.eyJdef.signature refresh-secret-x'}).encode()
        e=b.upstream_problem(self.Response(body),['secret-token-a','refresh-secret-x'])
        for secret in ['secret-token-a','refresh-secret-x','test@example.com','sk-abcdef','eyJabc.eyJdef.signature']:self.assertNotIn(secret,str(e))
    def test_json_success_not_mistaken_for_stream(self):
        e=b.upstream_problem(self.Response(b'{"id":"resp_x","status":"completed","output":[{"text":"do not accept"}]}'))
        self.assertEqual(e.code,'invalid_stream');self.assertNotIn('do not accept',str(e))
    def test_mislabeled_sse_is_diagnosed(self):
        e=b.upstream_problem(self.Response(b'data: {"type":"response.completed"}\n\n','text/plain'))
        self.assertIn('SSE 形态文本',str(e))
    def test_redirect_is_not_followed_with_credentials(self):
        with self.assertRaises(b.BridgeError) as c:b.NoRedirect().redirect_request(None,None,302,'',{},'https://example.invalid')
        self.assertEqual(c.exception.code,'upstream_redirect')

class SSEFramingTests(unittest.TestCase):
    class Response(io.BytesIO):
        def __init__(self,body,ctype=None):
            super().__init__(body);self.headers={} if ctype is None else {'Content-Type':ctype};self.status=200
    def body(self): return ''.join(complete('OK')).encode()
    def test_missing_content_type_with_complete_sse(self):
        self.assertEqual(b.collect_response(b.checked_sse_lines(self.Response(self.body())))['text'],'OK')
    def test_incorrect_content_type_with_complete_sse(self):
        self.assertEqual(b.collect_response(b.checked_sse_lines(self.Response(self.body(),'application/octet-stream')))['text'],'OK')
    def test_mixed_case_standard_header(self):
        self.assertEqual(b.collect_response(b.checked_sse_lines(self.Response(self.body(),'Text/Event-Stream; charset=utf-8')))['text'],'OK')
    def test_event_and_comment_prefixes(self):
        for prefix in [b'event: response.output_text.delta\n',b': heartbeat\n\n',b'\r\n\r\n']:
            with self.subTest(prefix=prefix):self.assertEqual(b.collect_response(b.checked_sse_lines(self.Response(prefix+self.body())))['text'],'OK')
    def test_json_completed_is_still_rejected(self):
        with self.assertRaises(b.BridgeError):b.collect_response(b.checked_sse_lines(self.Response(b'{"status":"completed","output":[]}','application/json')))
    def test_html_still_rejected(self):
        with self.assertRaises(b.BridgeError) as ctx:b.collect_response(b.checked_sse_lines(self.Response(b'<html><title>blocked</title></html>')))
        self.assertIn('blocked',str(ctx.exception))
    def test_partial_sse_still_rejected(self):
        with self.assertRaises(b.BridgeError) as ctx:b.collect_response(b.checked_sse_lines(self.Response(b'data: {"type":"response.output_text.delta","delta":"partial"}\n\n')))
        self.assertEqual(ctx.exception.code,'stream_interrupted')
    def test_error_after_partial_still_rejected(self):
        payload=''.join(stream({'type':'response.output_text.delta','delta':'partial'},{'type':'response.failed','response':{'error':{'code':'subscription_sharing_usage_limit_exceeded'}}})).encode()
        with self.assertRaises(b.BridgeError) as ctx:b.collect_response(b.checked_sse_lines(self.Response(payload)))
        self.assertEqual(ctx.exception.status,429)
    def test_large_first_event_is_not_split(self):
        payload=''.join(complete('a'*70000)).encode()
        self.assertEqual(len(b.collect_response(b.checked_sse_lines(self.Response(payload)))['text']),70000)
    def test_bom_prefix(self):
        self.assertEqual(b.collect_response(b.checked_sse_lines(self.Response(b'\xef\xbb\xbf'+self.body())))['text'],'OK')

class ManualModelTests(unittest.TestCase):
    def test_astra_high_request(self):
        body=b.response_body([{'role':'user','content':'q'}],'gpt-6-astra','high')
        self.assertEqual(body['model'],'gpt-6-astra');self.assertEqual(body['reasoning'],{'effort':'high'})
    def test_sol_no_none(self):
        with self.assertRaises(b.BridgeError) as c:b.response_body([{'role':'user','content':'q'}],'gpt-6.1-sol','none')
        self.assertEqual(c.exception.code,'invalid_effort')
    def test_luna_none(self):
        body=b.response_body([{'role':'user','content':'q'}],b.MODEL,'none');self.assertEqual(body['reasoning']['effort'],'none')
    def test_unknown_model_uses_default_without_reasoning(self):
        body=b.response_body([{'role':'user','content':'q'}],'future-model','default');self.assertNotIn('reasoning',body)
        with self.assertRaises(b.BridgeError):b.response_body([{'role':'user','content':'q'}],'future-model','high')
    def test_catalog_enrichment(self):
        with tempfile.TemporaryDirectory() as path:
            c=b.Client(b.Store(path),1455)
            data={'models':[{'slug':'gpt-6-astra','display_name':'Astra','visibility':'list'},{'slug':'future-model','visibility':'list'},{'slug':'hidden','visibility':'hide'}]}
            with patch.object(c,'access_token',return_value='mock'),patch.object(c,'get_json',return_value=data):rows=c.models()
            self.assertEqual(len(rows),2);self.assertIn('high',rows[0]['reasoning_efforts']);self.assertEqual(rows[1]['reasoning_efforts'],['default'])
    def test_selected_model_checked_and_sent_without_switching(self):
        with tempfile.TemporaryDirectory() as path:
            c=b.Client(b.Store(path),1455);jobs=b.Jobs(c)
            class Fake(io.BytesIO):headers={}
            def op(*a,**kw):return Fake(''.join(complete()).encode())
            with patch.object(c,'models',return_value=[{'slug':'gpt-6-astra'}]),patch.object(c,'access_token',return_value='mock'),patch.object(c,'open',side_effect=op) as request:
                d=jobs.create({'request_id':'astra-test-0123456789','model':'gpt-6-astra','effort':'high','messages':[{'role':'user','content':'q'}]})
                for _ in range(100):
                    j=jobs.get(d['id'])
                    if j['state'] in ['done','failed']:break
                    time.sleep(.01)
                self.assertEqual(j['state'],'done');self.assertEqual(j['result']['model'],'gpt-6-astra');self.assertEqual(j['result']['effort'],'high');self.assertEqual(request.call_args.kwargs['obj']['model'],'gpt-6-astra')
    def test_unavailable_model_never_calls_upstream(self):
        with tempfile.TemporaryDirectory() as path:
            c=b.Client(b.Store(path),1455);jobs=b.Jobs(c)
            with patch.object(c,'models',return_value=[{'slug':b.MODEL}]),patch.object(c,'open') as request:
                d=jobs.create({'request_id':'missing-test-0123456789','model':'gpt-6-astra','effort':'low','messages':[{'role':'user','content':'q'}]})
                for _ in range(100):
                    j=jobs.get(d['id'])
                    if j['state']=='failed':break
                    time.sleep(.01)
                self.assertEqual(j['error']['code'],'model_not_available');request.assert_not_called()

class QuotaTests(unittest.TestCase):
    def test_windows_are_server_defined(self):
        rows=b.quota_windows({'rateLimits':{'limitId':'codex','primary':{'usedPercent':25,'windowDurationMins':300,'resetsAt':123}}})
        self.assertEqual(rows[0]['remaining_percent'],75);self.assertEqual(rows[0]['window_minutes'],300)
    def test_missing_or_invalid_usage_is_not_zero(self):
        self.assertEqual(b.quota_windows({'rateLimits':{'primary':{'windowDurationMins':300}}}),[])
        self.assertEqual(b.quota_windows({'rateLimits':{'primary':{'usedPercent':float('nan')}}}),[])
    def test_multiple_buckets_kept_separate(self):
        rows=b.quota_windows({'rateLimitsByLimitId':{'a':{'primary':{'usedPercent':10}},'b':{'primary':{'usedPercent':30},'secondary':{'usedPercent':50}}}})
        self.assertEqual(len(rows),3);self.assertEqual([r['remaining_percent'] for r in rows],[90,70,50])
    def test_no_cli_is_explicit_not_zero(self):
        with tempfile.TemporaryDirectory() as p:
            store=b.Store(p);store.data['account']={'email':'test@example.invalid'}
            with patch.object(b.shutil,'which',return_value=None),self.assertRaises(b.BridgeError) as c:b.QuotaReader(store).read()
            self.assertEqual(c.exception.code,'codex_not_found')
    def test_read_only_rpc_and_window_difference(self):
        with tempfile.TemporaryDirectory() as p:
            store=b.Store(p);store.data['account']={'email':'test@example.invalid'};reader=b.QuotaReader(store)
            made=[];values=iter([25,28,5])
            class RPC:
                def __init__(self,*a):self.calls=[];self.percent=next(values);made.append(self)
                def rpc(self,method,params=None):
                    self.calls.append(method)
                    if method=='account/read':return {'account':{'type':'chatgpt','email':'test@example.invalid','planType':'plus'}}
                    if method=='account/rateLimits/read':return {'rateLimits':{'limitId':'codex','primary':{'usedPercent':self.percent,'windowDurationMins':300,'resetsAt':1000 if self.percent!=5 else 2000}}}
                    return {}
                def send(self,value):self.calls.append(value['method'])
                def close(self):pass
            with patch.object(b.shutil,'which',return_value='mock-codex'),patch.object(b,'CodexRPC',RPC):
                first=reader.read();self.assertIsNone(first['windows'][0]['change_pp']);reader.last['checked_at']-=16
                second=reader.read();self.assertEqual(second['windows'][0]['change_pp'],3);reader.last['checked_at']-=16
                third=reader.read();self.assertIsNone(third['windows'][0]['change_pp'])
                self.assertEqual(made[0].calls,['initialize','initialized','account/read','account/rateLimits/read'])
    def test_mismatched_account_never_reads_quota(self):
        with tempfile.TemporaryDirectory() as p:
            store=b.Store(p);store.data['account']={'email':'one@example.invalid'}
            rpc=unittest.mock.Mock();rpc.rpc.side_effect=[{},{'account':{'type':'chatgpt','email':'other@example.invalid'}}]
            with patch.object(b.shutil,'which',return_value='mock'),patch.object(b,'CodexRPC',return_value=rpc),self.assertRaises(b.BridgeError) as c:b.QuotaReader(store).read()
            self.assertEqual(c.exception.code,'codex_account_mismatch');self.assertEqual(rpc.rpc.call_count,2)
    def test_cached_quota_does_not_cross_accounts(self):
        with tempfile.TemporaryDirectory() as p:
            store=b.Store(p);store.data['account']={'email':'new@example.invalid'};r=b.QuotaReader(store)
            r.last={'checked_at':time.time(),'account_email':'old@example.invalid'}
            with patch.object(b.shutil,'which',return_value=None),self.assertRaises(b.BridgeError) as c:r.read()
            self.assertEqual(c.exception.code,'codex_not_found')

if __name__=='__main__':unittest.main(verbosity=2)
