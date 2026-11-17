// Sync self-check: paste into the app's console (or load as a script). Fakes Firebase, runs two "devices" through login, edits and merges.
(async () => {
  const out = [], wait = ms => new Promise(r => setTimeout(r, ms)), saved = { ...FB }, realFetch = window.fetch;
  let remote = null, writes = 0;
  window.fetch = async (url, o = {}) => {
    url = String(url); const J = (s, b) => new Response(JSON.stringify(b), { status: s });
    if (url.includes('identitytoolkit')) { const b = JSON.parse(o.body); return b.password === 'bad' ? J(400, { error: { message: 'INVALID_LOGIN_CREDENTIALS' } }) : J(200, { localId: 'u1', email: b.email, idToken: 'tok', refreshToken: 'ref', expiresIn: '3600' }); }
    if (url.includes('firestore')) { if (o.headers.Authorization !== 'Bearer tok') return J(403, {}); if (o.method === 'GET') return remote ? J(200, { fields: { data: { stringValue: remote } } }) : J(404, {}); remote = JSON.parse(o.body).fields.data.stringValue; writes++; return J(200, {}); }
    return realFetch(url, o);
  };
  FB.apiKey = 'k'; FB.projectId = 'p';
  const T = (k, title) => ({ key: k, source: 'deezer', id: 1, title, artist: 'X' });
  const keys = () => state.lib.map(t => t.key).sort().join(','), rkeys = () => JSON.parse(remote).lib.map(t => t.key).sort().join(',');
  const check = (name, ok) => out.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' [local=' + keys() + ' remote=' + (remote && rkeys()) + ' t=' + localStorage.getItem('gm-t') + ' base=' + localStorage.getItem('gm-base') + ']'));
  try {
    // device A has data; wrong password first
    state.lib = [T('a', 'A')]; state.playlists = [{ id: 'u1', name: 'Mine', own: true, tracks: [T('a', 'A')] }]; saveLib(); savePl();
    $('acctbtn').click(); $('acctemail').value = 'me@x.com'; $('acctpw').value = 'bad'; $('acctform').requestSubmit(); await wait(200);
    check('wrong password message', $('acctres').textContent === 'Wrong email or password.');
    $('acctpw').value = 'secret1'; $('acctform').requestSubmit(); await wait(300);
    check('A login pushes library', remote && rkeys() === 'a' && $('acctbtn').classList.contains('on'));
    const A = { lib: localStorage.getItem('gm-lib'), pl: localStorage.getItem('gm-pl'), t: localStorage.getItem('gm-t'), base: localStorage.getItem('gm-base') };
    // device B starts empty and gets A's data
    $('acctlogout').click(); applyData({ t: 0, lib: [], playlists: [], recent: [] }); ls('gm-t');
    $('acctpw').value = 'secret1'; $('acctform').requestSubmit(); await wait(300);
    check('B login pulls library + playlists', keys() === 'a' && state.playlists[0]?.name === 'Mine');
    await wait(5); state.lib.push(T('b', 'B')); saveLib(); await wait(1800);
    check('B edit is pushed', rkeys() === 'a,b');
    // A was offline (stale) and adds c: both changes are kept
    applyData({ t: +A.t, lib: JSON.parse(A.lib), playlists: JSON.parse(A.pl), recent: [] }); ls('gm-base', A.base);
    await wait(5); state.lib.push(T('c', 'C')); saveLib(); await wait(1800);
    check('stale device merges', keys() === 'a,b,c' && rkeys() === 'a,b,c');
    // another device deletes a; A has no local changes, so it takes the newer copy
    const r = JSON.parse(remote); r.lib = r.lib.filter(t => t.key !== 'a'); r.t = Date.now() + 5; remote = JSON.stringify(r);
    await sync();
    check('newer remote replaces local', keys() === 'b,c' && document.querySelectorAll('#liblist .row').length === 2);
    const w = writes; await sync(); check('no write when nothing changed', writes === w);
    $('acctlogout').click();
    check('logout keeps songs', keys() === 'b,c' && !localStorage.getItem('gm-auth'));
  } catch (e) { out.push('ERROR ' + e.stack); }
  window.fetch = realFetch; Object.assign(FB, saved); acct.close();
  document.body.dataset.selfcheck = out.join('\n'); console.log(out.join('\n'));
})();
