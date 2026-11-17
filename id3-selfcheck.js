// Self-check for id3() in index.html. Open the app on localhost, then paste this into the devtools console.
(async () => {
  const png = async color => { const c = new OffscreenCanvas(400, 400), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 400, 400); return new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer()); };
  const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
  const L = s => Uint8Array.from([...s].map(c => c.charCodeAt(0)));
  const U16 = s => { const o = [0xFF, 0xFE]; for (const c of s) o.push(c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8); return Uint8Array.from(o); };
  const U8 = s => new TextEncoder().encode(s);
  const sz = (n, v) => v === 4 ? [n >> 21 & 127, n >> 14 & 127, n >> 7 & 127, n & 127] : [n >>> 24, n >> 16 & 255, n >> 8 & 255, n & 255];
  const fr = (id, d, v) => cat(L(id), Uint8Array.from(sz(d.length, v)), Uint8Array.from([0, 0]), d);
  const tag = (v, ...frames) => { const body = cat(...frames, new Uint8Array(20)); return cat(L('ID3'), Uint8Array.from([v, 0, 0]), Uint8Array.from(sz(body.length, 4)), body); };
  const color = async u => { const i = new Image(); i.src = u; await i.decode(); const x = new OffscreenCanvas(i.width, i.height).getContext('2d'); x.drawImage(i, 0, 0); return [...x.getImageData(5, 5, 1, 1).data.slice(0, 3)]; };
  const red = await png('#f00'), blue = await png('#00f');
  // v2.3: latin1 title, UTF-16 artist, an "other" picture before the front cover
  const a = await id3(new File([tag(3, fr('TIT2', cat([0], L('Caf\xe9 Song')), 3), fr('TPE1', cat([1], U16('Goldie & Rufige')), 3),
    fr('APIC', cat([0], L('image/png\0'), [0], L('other\0'), red), 3), fr('APIC', cat([0], L('image/png\0'), [3], L('front\0'), blue), 3))], 'a.mp3'));
  console.assert(a.title === 'Café Song' && a.artist === 'Goldie & Rufige', 'v2.3 text', a);
  console.assert((await color(a.cover))[2] > 200, 'front cover wins');
  // v2.4: UTF-8 with two artists, UTF-16 picture description
  const b = await id3(new File([tag(4, fr('TIT2', cat([3], U8('Ünïcode Tïtle')), 4), fr('TPE1', cat([3], U8('Artist A\0Artist B')), 4),
    fr('APIC', cat([1], L('image/png\0'), [3], U16('d'), [0, 0], red), 4))], 'b.mp3'));
  console.assert(b.title === 'Ünïcode Tïtle' && b.artist === 'Artist A, Artist B', 'v2.4 text', b);
  console.assert((await color(b.cover))[0] > 200, 'v2.4 cover');
  console.assert(!(await id3(new File([U8('no tag')], 'x.mp3'))).title, 'untagged file');
  console.log('id3 self-check done (any failures are logged above)');
})();
