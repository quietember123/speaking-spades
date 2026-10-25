import { firebaseConfig } from './firebase-config.js';
const $ = id => document.getElementById(id);
const msg = text => { $('auth-message').textContent = text; };
const configured = ['apiKey','authDomain','projectId','appId'].every(k => firebaseConfig[k] && !firebaseConfig[k].includes('REPLACE_ME'));
if (!configured) { $('auth-state').textContent='Demo mode — account login is not connected yet.'; ['auth-signup','auth-login','auth-reset'].forEach(id => $(id).disabled=true); }
else {
  try {
    const [{ initializeApp }, authMod, dbMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    const app=initializeApp(firebaseConfig), auth=authMod.getAuth(app), db=dbMod.getFirestore(app);
    const {createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,onAuthStateChanged,reload,updateProfile}=authMod;
    const {doc,setDoc,getDoc,serverTimestamp}=dbMod;
    const usernameOk = name => /^[a-zA-Z0-9_]{3,20}$/.test(name);
    const friendly = e => ({'auth/email-already-in-use':'That email already has an account.','auth/invalid-email':'Enter a valid email address.','auth/invalid-credential':'Incorrect email or password.','auth/weak-password':'Use a stronger password.','auth/too-many-requests':'Too many attempts. Try again later.'}[e.code] || e.message || 'Something went wrong.');
    $('auth-signup').onclick=async()=>{const email=$('auth-email').value.trim(),pw=$('auth-password').value,name=$('auth-username').value.trim();if(!usernameOk(name)){msg('Username must be 3–20 letters, numbers, or underscores.');return;}try{const cred=await createUserWithEmailAndPassword(auth,email,pw);await updateProfile(cred.user,{displayName:name});await setDoc(doc(db,'profiles',cred.user.uid),{username:name,createdAt:serverTimestamp()});await sendEmailVerification(cred.user);msg('Account created. Check your email and click the verification link.');}catch(e){msg(friendly(e));}};
    $('auth-login').onclick=async()=>{try{await signInWithEmailAndPassword(auth,$('auth-email').value.trim(),$('auth-password').value);msg('Signed in.');}catch(e){msg(friendly(e));}};
    $('auth-reset').onclick=async()=>{const email=$('auth-email').value.trim();if(!email){msg('Enter your email address first.');return;}try{await sendPasswordResetEmail(auth,email);msg('If that address is registered, password reset instructions will arrive by email.');}catch(e){msg(friendly(e));}};
    $('auth-verify').onclick=async()=>{try{await sendEmailVerification(auth.currentUser);msg('Verification email sent.');}catch(e){msg(friendly(e));}};
    $('auth-refresh').onclick=async()=>{try{await reload(auth.currentUser);show(auth.currentUser);msg(auth.currentUser.emailVerified?'Email verified!':'Not verified yet. Check your inbox.');}catch(e){msg(friendly(e));}};
    $('auth-logout').onclick=()=>signOut(auth).catch(e=>msg(friendly(e)));
    $('auth-save').onclick=async()=>{const name=$('auth-displayname').value.trim();if(!usernameOk(name)){msg('Username must be 3–20 letters, numbers, or underscores.');return;}try{await setDoc(doc(db,'profiles',auth.currentUser.uid),{username:name},{merge:true});await updateProfile(auth.currentUser,{displayName:name});show(auth.currentUser);msg('Username updated.');}catch(e){msg(friendly(e));}};
    function show(user){$('auth-guest').hidden=!!user;$('auth-member').hidden=!user;$('auth-state').textContent=user?'Signed in':'Guest practice mode';if(user){$('auth-profile').textContent=`${user.displayName||'Player'} • ${user.email} • ${user.emailVerified?'Email verified':'Email NOT verified'}`;$('auth-verify').hidden=user.emailVerified;}}
    onAuthStateChanged(auth,async user=>{show(user);if(user){try{const snap=await getDoc(doc(db,'profiles',user.uid));if(snap.exists())$('auth-profile').textContent+=` • Profile: ${snap.data().username}`;}catch(e){msg('Profile could not be loaded: '+friendly(e));}}});
  } catch(e){$('auth-state').textContent='Account service could not load; practice still works.';msg(String(e.message||e));}
}
