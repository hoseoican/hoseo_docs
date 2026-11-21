#!/usr/bin/env python3
"""운영 관리 화면을 깃허브 페이지용 한 파일(manage/index.html)로 만든다.
쓰는 법:  python3 build_pages.py <gas 폴더(App.html·Lib.html·Styles.html)> [출력 파일]
 - 앱스 스크립트 템플릿 표시(<? ?>)를 없애고, 주소의 ?a= ?s= ?u= ?st= ?join= ?b= ?r= ?n= 을 그대로 읽는다.
 - google.script.run 을 운영 관리 앱스 스크립트 웹앱 주소(config.js 의 OPS_API)로 보내는 fetch 로 바꾼다.
"""
import sys, os, re
gas = sys.argv[1] if len(sys.argv) > 1 else '../../../port_src/gas'
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'index.html')
rd = lambda n: open(os.path.join(gas, n), encoding='utf-8').read()
app = rd('App.html')
SHIM = r'''<script src="config.js"></script>
<script>
/* 주소에서 화면 종류를 읽음 (앱스 스크립트 doGet 과 같은 규칙) */
(function(){
  var p=new URLSearchParams(location.search), g=function(k){ return p.get(k)||''; }, d=document.body.dataset;
  d.mode = g('a') ? 'admin' : g('s') ? 'school' : g('u') ? 'univ' : g('st') ? 'stats' : p.has('join') ? 'join' : 'teacher';
  d.token = g('s')||g('u')||g('st'); d.key=''; d.link=g('a'); d.biz=g('b'); d.trole = g('r')==='asst' ? 'asst' : ''; d.aname=g('n');
  document.title = g('a') ? '초등방과후 프로그램 운영 관리' : g('r')==='asst' ? '초등방과후 프로그램 보조강사 신청' : g('u') ? '희망 강사 선택' : g('st') ? '운영 통계' : p.has('join') ? '초등방과후 프로그램 기관 담당자 페이지' : '초등방과후 프로그램 강사 신청';
})();
/* google.script.run 대신 웹앱 주소로 요청 */
(function(){
  var API = window.OPS_API || '';
  try { var t=new URLSearchParams(location.search).get('api'); if(t && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) API=t; } catch(e){}
  function rpc(fn, args){
    if(typeof window.__opsLocal==='function') return window.__opsLocal(fn, args);
    if(!API) return Promise.reject(new Error('운영 관리 서버 주소가 설정되지 않았습니다 (manage/config.js 의 OPS_API).'));
    return fetch(API, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args }), redirect:'follow' })
      .then(function(r){ return r.text(); })
      .then(function(t){ var j; try { j=JSON.parse(t); } catch(e){ throw new Error('서버 응답을 읽을 수 없습니다. 앱스 스크립트 Code.gs 가 최신인지, 「배포 관리 → 연필 → 새 버전 → 배포」를 했는지 확인해 주세요.'); } if(!j.ok) throw new Error(j.error||'요청을 처리하지 못했습니다'); return j.r; },
            function(e){ throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.'); });
  }
  function mk(ok, fail){
    return new Proxy({}, { get: function(_, k){
      if(k==='withSuccessHandler') return function(f){ return mk(f, fail); };
      if(k==='withFailureHandler') return function(f){ return mk(ok, f); };
      if(k==='withUserObject') return function(){ return mk(ok, fail); };
      return function(){ var a=[].slice.call(arguments); rpc(k, JSON.parse(JSON.stringify(a))).then(function(r){ if(ok) ok(r); }, function(e){ if(fail) fail(e); }); };
    } });
  }
  window.google = { script: { get run(){ return mk(null, null); } } };
  window.ON_PAGES = true;
})();
</script>'''
app = app.replace("<?!= include('Styles') ?>", rd('Styles.html')).replace("<?!= include('Lib') ?>", rd('Lib.html'))
body = re.search(r'<body data-mode=.*?aname \?>">', app).group(0)
assert '<?=' in body
app = app.replace(body, '<body data-mode="teacher" data-token="" data-key="" data-link="" data-biz="" data-trole="" data-aname="">\n' + SHIM)
app = app.replace('<base target="_top">\n', '')
assert '<?' not in app.replace('<?xml', ''), 'template tag left'
open(out, 'w', encoding='utf-8').write(app)
print('wrote', out, len(app))
