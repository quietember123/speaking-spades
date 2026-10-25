// Speaking Spades private-room lobby beta. No card-state synchronization yet.
export function initLobby({auth, db, authMod, dbMod}) {
  const $ = id => document.getElementById(id);
  const {doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, serverTimestamp, arrayRemove} = dbMod;
  let current = null, stop = null, busy = false;
  const say = text => { $('lobby-status').textContent = text; };
  const roomRef = code => doc(db, 'rooms', code);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newCode() {
    const bytes = new Uint8Array(12); crypto.getRandomValues(bytes);
    return [...bytes].map(n => alphabet[n % alphabet.length]).join('');
  }
  function verifiedUser() {
    const u = auth.currentUser;
    if (!u || !u.emailVerified) throw Error('Sign in and verify your email first. Then press Check verification.');
    return u;
  }
  function toggle(active) {
    $('lobby-entry').hidden = active;
    $('lobby-active').hidden = !active;
  }
  async function leaveRoom() {
    if (!current) return;
    const code = current; const uid = auth.currentUser?.uid;
    const snap = await getDoc(roomRef(code));
    if (snap.exists() && uid && snap.data().members.includes(uid)) {
      if (snap.data().hostUid === uid) {
        if (snap.data().members.length !== 1) throw Error('Host cannot leave while others are in the room. Ask them to leave first.');
        await deleteDoc(roomRef(code));
      } else await updateDoc(roomRef(code), {members: arrayRemove(uid)});
    }
    if (stop) stop(); stop = null; current = null; toggle(false); say('You left the private room.');
  }
  function watch(code) {
    if (stop) stop(); current = code; toggle(true);
    $('lobby-current-code').textContent = code;
    stop = onSnapshot(roomRef(code), async snap => {
      if (!snap.exists() || !snap.data().members.includes(auth.currentUser?.uid)) {
        if (stop) stop(); stop = null; current = null; toggle(false); say('Room closed or your seat is no longer available.'); return;
      }
      const room = snap.data();
      $('lobby-settings').textContent = `${room.mode === 'joker' ? 'Joker' : 'Classic'} Spades • ${room.members.length} humans + ${room.cpuSeats || 0} Expert CPUs / 4 seats`;
      $('lobby-players').replaceChildren();
      for (const [i, uid] of room.members.entries()) {
        const p = document.createElement('p');
        p.textContent = `${i+1}. ${uid === room.hostUid ? 'Host' : 'Player'} ${uid === auth.currentUser?.uid ? '(You)' : '• joined'} `;
        $('lobby-players').append(p);
      }
      for (let i=0; i<(room.cpuSeats||0); i++) {
        const p=document.createElement('p'); p.textContent=`CPU ${i+1} • Expert (reserved seat)`;
        $('lobby-players').append(p);
      }
      $('lobby-fill-cpu').disabled = room.hostUid !== auth.currentUser?.uid || room.members.length+(room.cpuSeats||0)===4;
      $('lobby-clear-cpu').disabled = room.hostUid !== auth.currentUser?.uid || !(room.cpuSeats||0);
      say('Private lobby connected. CPU seats are placeholders until online gameplay is built.');
    }, err => say('Room connection error: ' + err.message));
  }
  async function task(fn) {
    if (busy) return; busy = true;
    $('lobby-create').disabled = $('lobby-join').disabled = true;
    try { await fn(); } catch(e) { say(e.message || String(e)); }
    finally { busy = false; $('lobby-create').disabled = $('lobby-join').disabled = false; }
  }
  $('lobby-create').onclick = () => task(async () => {
    const u = verifiedUser(); if (current) throw Error('Leave your existing room first.');
    const mode = $('lobby-mode').value;
    // Collision-resistant random code; reject collision using transaction.
    for (let tries=0; tries<3; tries++) {
      const code = newCode(); const ref = roomRef(code);
      try {
        await runTransaction(db, async tx => {
          const snap = await tx.get(ref);
          if (snap.exists()) throw Error('Code collision');
          tx.set(ref, {hostUid:u.uid, members:[u.uid], mode, status:'waiting', cpuSeats:0, createdAt:serverTimestamp()});
        });
        watch(code); return;
      } catch(e) { if (e.message !== 'Code collision') throw e; }
    }
    throw Error('Could not generate an unused room code. Try again.');
  });
  $('lobby-join').onclick = () => task(async () => {
    const u = verifiedUser(); if (current) throw Error('Leave your existing room first.');
    const code = $('lobby-code').value.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) throw Error('Enter a valid 12-character invite code.');
    await runTransaction(db, async tx => {
      const ref = roomRef(code), snap = await tx.get(ref);
      if (!snap.exists()) throw Error('Room not found. Check the code.');
      const r = snap.data();
      if (r.status !== 'waiting') throw Error('Room is not accepting players.');
      if (r.members.includes(u.uid)) return;
      if (r.members.length + (r.cpuSeats || 0) >= 4) throw Error('Room is full.');
      tx.update(ref, {members:[...r.members,u.uid]});
    });
    watch(code);
  });
  async function setCpuSeats(fill) {
    const u=verifiedUser(); if(!current)throw Error('Create or join a room first.');
    await runTransaction(db, async tx=>{
      const ref=roomRef(current), snap=await tx.get(ref);
      if(!snap.exists())throw Error('Room no longer exists.');
      const r=snap.data();
      if(r.hostUid!==u.uid)throw Error('Only the host can manage CPU seats.');
      if(r.status!=='waiting')throw Error('Room is no longer waiting.');
      tx.update(ref,{cpuSeats:fill?4-r.members.length:0});
    });
  }
  $('lobby-fill-cpu').onclick=()=>task(()=>setCpuSeats(true));
  $('lobby-clear-cpu').onclick=()=>task(()=>setCpuSeats(false));
  $('lobby-leave').onclick = () => task(leaveRoom);
  $('lobby-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(current); say('Invite code copied.'); }
    catch { say('Copy the code shown above to share with a friend.'); }
  };
  authMod.onAuthStateChanged(auth, async u => {
    $('lobby-shell').hidden = !u || !u.emailVerified;
    if ((!u || !u.emailVerified) && stop) {stop();stop=null;current=null;toggle(false);}
    if (u && !u.emailVerified) say('Verify your email and press Check verification to use private rooms.');
  });
  $('auth-refresh').addEventListener('click', () => setTimeout(() => {
    const u = auth.currentUser; $('lobby-shell').hidden = !u || !u.emailVerified;
  }, 900));
}
