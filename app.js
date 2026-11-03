// Supabase public client configuration. Never put a secret/service-role key here.
const SUPABASE_URL = "https://uiedoohybbtmdcbcwgxm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-ZyAW5iuBSIO24D0f54YYw_Yx3HTj-9";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const STORE_KEY = "safeRideNorthernDemo_v1";
const $ = (s, root=document) => root.querySelector(s);
const app = $("#app");
let state = JSON.parse(localStorage.getItem(STORE_KEY) || '{"rides":[],"drivers":[],"user":null}');
let installPrompt = null;
const money = n => "UGX " + Number(n || 0).toLocaleString("en-UG");
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));
const toast = msg => { const el=$("#toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); };
$("#year").textContent = new Date().getFullYear();
async function checkBackend(){
  const pill = document.querySelector(".demo-pill");
  if (!supabaseClient) { pill.textContent = "Backend unavailable"; return; }
  try {
    const { error } = await supabaseClient.from("profiles").select("user_id").limit(1);
    if (error) throw error;
    pill.textContent = "Database connected";
    pill.title = "Supabase database is responding.";
  } catch (err) {
    pill.textContent = "Backend needs setup";
    pill.title = "Supabase connection check failed: " + (err.message || "unknown error");
    console.warn("Safe Ride Supabase check:", err);
  }
}
checkBackend();

let activeAuthUser = null;
const SITE_URL = "https://okolaalbert.github.io/safe-ride-northern-ug/";
async function authGate(role, mode="signup"){
  const roleLabel = role === "driver" ? "Driver" : "Passenger";
  const isSignup = mode === "signup";
  shell(roleLabel + (isSignup ? " registration" : " sign in"), "Create an account or sign in securely using Supabase.", `
    <div class="tabs">
      <button class="tab ${isSignup?"active":""}" id="signupTab">Create account</button>
      <button class="tab ${!isSignup?"active":""}" id="loginTab">Sign in</button>
    </div>
    <form id="authForm" class="form-grid">
      ${isSignup ? `
      <div class="field full"><label>Full name</label><input id="authName" autocomplete="name" placeholder="Your full name" required maxlength="80"></div>
      <div class="field full"><label>Telephone number</label><input id="authPhone" type="tel" autocomplete="tel" placeholder="+256 7XX XXX XXX" required maxlength="20"></div>` : ""}
      <div class="field full"><label>Email address</label><input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com" required></div>
      <div class="field full"><label>Password</label><input id="authPassword" type="password" autocomplete="${isSignup?"new-password":"current-password"}" minlength="6" placeholder="At least 6 characters" required></div>
      <div class="field full"><button class="primary-btn wide" type="submit">${isSignup?"Create account":"Sign in"}</button></div>
    </form>
    <div id="authMessage" class="notice"> ${isSignup?"Email verification will be sent to your inbox.":"Use the email and password for your existing account."}</div>
  `);
  $("#signupTab").onclick=()=>authGate(role,"signup");
  $("#loginTab").onclick=()=>authGate(role,"login");
  $("#authForm").onsubmit=async e=>{
    e.preventDefault();
    const message=$("#authMessage");
    const email=$("#authEmail").value.trim();
    const password=$("#authPassword").value;
    const submit=$("#authForm button[type=submit]");
    submit.disabled=true; submit.textContent="Please wait…";
    try{
      if(isSignup){
        const fullName=$("#authName").value.trim();
        const phone=$("#authPhone").value.trim();
        if(!fullName || !phone) throw new Error("Enter your name and telephone number.");
        const {data,error}=await supabaseClient.auth.signUp({
          email,password,
          options:{data:{full_name:fullName,phone,account_type:role},emailRedirectTo:SITE_URL}
        });
        if(error) throw error;
        if(data.session){
          activeAuthUser=data.user;
          message.textContent="Account created and signed in. Email verification may still be required.";
          authSuccess(role,data.user);
        }else{
          message.textContent="Registration received. Check your email and open the verification link before signing in.";
          submit.disabled=false; submit.textContent="Create account";
        }
      }else{
        const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
        if(error) throw error;
        activeAuthUser=data.user;
        const savedRole=data.user.user_metadata?.account_type || role;
        authSuccess(savedRole,data.user);
      }
    }catch(err){
      message.textContent=err.message || "Unable to complete authentication. Please try again.";
      submit.disabled=false; submit.textContent=isSignup?"Create account":"Sign in";
    }
  };
}
function authSuccess(role,user){
  const name=user.user_metadata?.full_name || user.email || "Account";
  state.user={role,name,phone:user.user_metadata?.phone||""}; save();
  toast("Signed in successfully.");
  if(role==="driver") driver(); else passenger();
}
async function restoreAuth(){
  if(!supabaseClient)return;
  const {data}=await supabaseClient.auth.getSession();
  if(data.session){
    activeAuthUser=data.session.user;
    const role=activeAuthUser.user_metadata?.account_type || "passenger";
    state.user={role,name:activeAuthUser.user_metadata?.full_name||activeAuthUser.email,phone:activeAuthUser.user_metadata?.phone||""};
    save();
  }
}
function home(){app.innerHTML = `
<section class="welcome"><div class="welcome-copy"><span class="eyebrow">MOVE WITH CONFIDENCE</span><h1>Your journey.<br><em>Your choice.</em></h1><p>Book a boda-boda or taxi with a simple, safer ride experience built for Northern Uganda.</p><div class="trust-points"><span>✓ Clear fare estimates</span><span>✓ Trip status updates</span><span>✓ Local transport options</span></div></div><div class="welcome-art" aria-hidden="true"><div class="sun"></div><div class="road"></div><div class="route-line"></div><div class="pin pin-a">A</div><div class="pin pin-b">B</div><div class="art-label">NORTHERN UGANDA</div></div></section>
<section class="role-section"><div class="section-heading"><div><span class="eyebrow">GET STARTED</span><h2>How would you like to use Safe Ride?</h2></div><span class="step-count">01 / 02</span></div><div class="role-grid"><button class="role-card" data-role="passenger"><span class="role-icon">↗</span><strong>Book a ride</strong><small>I'm a passenger</small><span class="card-arrow">→</span></button><button class="role-card" data-role="driver"><span class="role-icon">⌁</span><strong>Drive with us</strong><small>I'm a boda or taxi driver</small><span class="card-arrow">→</span></button><button class="role-card admin-card" data-role="admin"><span class="role-icon">▦</span><strong>Admin demo</strong><small>Platform overview</small><span class="card-arrow">→</span></button></div><p class="fine-print">Demonstration mode only. Do not enter real passwords, payment details, or sensitive personal information.</p></section>`;
app.querySelectorAll("[data-role]").forEach(b=>b.onclick=()=>b.dataset.role==="admin"?adminLogin():authGate(b.dataset.role));}
function shell(title,sub,body){app.innerHTML=`<section class="panel"><button class="back-btn" id="back">← Back to home</button><div class="panel-head"><div><span class="eyebrow">SAFE RIDE NORTHERN UG</span><h2>${title}</h2><p>${sub}</p></div><span class="tag">DEMO</span></div>${body}</section>` ;$("#back").onclick=home;}
function fare(type,from,to){const base=type==="Taxi"?5000:1500; const a=(from.length+to.length)%7; return base+a*(type==="Taxi"?1000:500)+ (type==="Taxi"?3000:1000);}
async function passenger(){
  if(!activeAuthUser){authGate("passenger","login");return;}
  const profile=activeAuthUser.user_metadata||{};
  shell("Book your ride","Your ride requests will be saved to your online account.",`
  <div class="form-grid">
    <div class="field full"><label>Your name</label><input id="pname" value="${(profile.full_name||"").replace(/"/g,"&quot;")}" readonly></div>
    <div class="field"><label>Pickup location</label><input id="pickup" placeholder="e.g. Gulu Main Market" required></div>
    <div class="field"><label>Destination</label><input id="destination" placeholder="e.g. Lacor Hospital" required></div>
    <div class="field"><label>Ride type</label><select id="rideType"><option>Boda-boda</option><option>Taxi</option></select></div>
    <div class="field"><label>Payment preference</label><select id="payment"><option>Cash</option><option>MTN Mobile Money (coming soon)</option><option>Airtel Money (coming soon)</option></select></div>
  </div>
  <div class="notice">The fare is currently an illustrative estimate, not a distance-based quote. Payment integrations are not active.</div>
  <button class="primary-btn wide" id="estimate">Estimate fare</button><div id="fareResult"></div>
  <div class="tabs"><button class="tab active">My online rides</button></div><div id="rideList">Loading your rides…</div>`);
  async function loadMyRides(){
    const el=$("#rideList");
    const {data,error}=await supabaseClient.from("rides").select("id,pickup_location,destination,vehicle_type,estimated_fare,status,created_at").eq("passenger_id",activeAuthUser.id).order("created_at",{ascending:false});
    if(error){el.textContent="Could not load rides: "+error.message;return;}
    el.innerHTML=data.length?data.map(r=>rideHtml({id:String(r.id),type:r.vehicle_type==="boda"?"Boda-boda":"Taxi",from:r.pickup_location,to:r.destination,amount:r.estimated_fare,status:r.status})).join(""):'<div class="empty">You have not requested a ride yet.</div>';
  }
  await loadMyRides();
  $("#estimate").onclick=()=>{
    const from=$("#pickup").value.trim(),to=$("#destination").value.trim(),type=$("#rideType").value;
    if(!from||!to){toast("Enter both pickup and destination.");return;}
    const amount=fare(type,from,to);
    $("#fareResult").innerHTML=`<div class="ride-card"><div class="ride-top"><strong>Illustrative fare</strong><span class="tag">${type}</span></div><h2>${money(amount)}</h2><p>${from} → ${to}</p><button class="primary-btn wide" id="confirmRide">Save ride request online</button></div>`;
    $("#confirmRide").onclick=async()=>{
      const button=$("#confirmRide");button.disabled=true;button.textContent="Saving…";
      const {error}=await supabaseClient.from("rides").insert({
        passenger_id:activeAuthUser.id,
        pickup_location:from,
        destination:to,
        vehicle_type:type==="Taxi"?"taxi":"boda",
        estimated_fare:amount,
        status:"requested"
      });
      if(error){toast("Ride not saved: "+error.message);button.disabled=false;button.textContent="Save ride request online";return;}
      toast("Your ride request was saved online.");$("#fareResult").innerHTML="";await loadMyRides();
    };
  };
}
function rideHtml(r){return `<div class="ride-card"><div class="ride-top"><strong>${r.id} · ${r.type}</strong><span class="status ${r.status==="Completed"?"done":""}">${r.status}</span></div><p>${r.from} → ${r.to}</p><div class="ride-top"><small>${r.passenger}${r.driver?" · Driver: "+r.driver:""}</small><strong>${money(r.amount)}</strong></div></div>`;}
async function driver(){
  if(!activeAuthUser){authGate("driver","login");return;}
  const meta=activeAuthUser.user_metadata||{};
  shell("Driver workspace","Register your vehicle and view ride requests saved online.",`
    <div class="form-grid">
      <div class="field"><label>Driver name</label><input id="dname" value="${(meta.full_name||"").replace(/"/g,"&quot;")}" readonly></div>
      <div class="field"><label>Phone number</label><input id="dphone" value="${(meta.phone||"").replace(/"/g,"&quot;")}" readonly></div>
      <div class="field"><label>Vehicle</label><select id="dtype"><option value="boda">Boda-boda</option><option value="taxi">Taxi</option></select></div>
      <div class="field"><label>Vehicle registration</label><input id="vehicleReg" placeholder="e.g. UEX 123A" maxlength="20"></div>
    </div>
    <button class="primary-btn wide" id="registerDriver">Save driver profile online</button>
    <div class="notice">New drivers remain unverified until an administrator completes the required checks. Only verified drivers should be dispatched for real trips.</div>
    <div class="tabs"><button class="tab active">Available online requests</button></div><div id="driverRides">Loading ride requests…</div>`);
  let driverProfile = null;
  async function loadDriverProfile(){
    const {data,error}=await supabaseClient.from("drivers").select("vehicle_type,vehicle_registration,verified,is_online").eq("user_id",activeAuthUser.id).maybeSingle();
    if(error){toast("Could not load driver profile: "+error.message);return;}
    driverProfile = data;
    if(data){
      $("#dtype").value=data.vehicle_type;
      $("#vehicleReg").value=data.vehicle_registration||"";
      $("#registerDriver").textContent="Update driver profile";
    }
  }
  $("#registerDriver").onclick=async()=>{
    const registration=$("#vehicleReg").value.trim();
    if(!registration){toast("Enter your vehicle registration.");return;}
    const vehicle=$("#dtype").value;
    const btn=$("#registerDriver");btn.disabled=true;btn.textContent="Saving…";
    const payload={user_id:activeAuthUser.id,vehicle_type:vehicle,vehicle_registration:registration,verified:false,is_online:false};
    const {error}=await supabaseClient.from("drivers").upsert(payload,{onConflict:"user_id"});
    if(error){toast("Driver profile not saved: "+error.message);btn.disabled=false;btn.textContent="Save driver profile online";return;}
    toast("Driver profile saved. Verification is still required.");
    btn.disabled=false;btn.textContent="Update driver profile";
  };
  async function loadAvailableRides(){
    const el=$("#driverRides");
    const {data,error}=await supabaseClient.from("rides").select("id,pickup_location,destination,vehicle_type,estimated_fare,created_at").eq("status","requested").order("created_at",{ascending:false});
    if(error){el.textContent="Could not load ride requests: "+error.message;return;}
    const canClaim=!!(driverProfile&&driverProfile.verified&&driverProfile.is_online);
    el.innerHTML=data.length?data.map(r=>`<div class="ride-card"><div class="ride-top"><strong>Ride request</strong><span class="status">New request</span></div><p>${r.pickup_location} → ${r.destination}</p><div class="ride-top"><small>${r.vehicle_type==="boda"?"Boda-boda":"Taxi"}</small><strong>${money(r.estimated_fare)}</strong></div>${canClaim?`<button class="primary-btn wide" data-claim-ride="${r.id}">Accept this ride</button>`:"<div class='notice'>Ride acceptance is locked until an administrator verifies your driver account and sets it online.</div>"}</div>`).join(""):'<div class="empty">No available ride requests right now.</div>';
    el.querySelectorAll("[data-claim-ride]").forEach(btn=>btn.onclick=async()=>{
      btn.disabled=true;btn.textContent="Accepting…";
      const {data:claimData,error:claimError}=await supabaseClient.rpc("claim_ride",{p_ride_id:btn.dataset.claimRide});
      if(claimError){toast("Could not accept ride: "+claimError.message);btn.disabled=false;btn.textContent="Accept this ride";return;}
      toast("Ride accepted successfully.");
      await loadAvailableRides();
    });
  }
  await loadDriverProfile();
  await loadAvailableRides();
}

async function adminLogin(){
  if(!activeAuthUser){
    shell("Administrator sign in","Sign in with the administrator account approved for this platform.",`
      <form id="adminLoginForm" class="form-grid">
        <div class="field full"><label>Administrator email</label><input id="adminEmail" type="email" autocomplete="username" required></div>
        <div class="field full"><label>Password</label><input id="adminPassword" type="password" autocomplete="current-password" required></div>
        <div class="field full"><button class="primary-btn wide" type="submit">Sign in as administrator</button></div>
      </form><div id="adminLoginMessage" class="notice">Administrator access is restricted to approved accounts.</div>`);
    $("#adminLoginForm").onsubmit=async e=>{
      e.preventDefault();
      const btn=$("#adminLoginForm button[type=submit]"),msg=$("#adminLoginMessage");
      btn.disabled=true;btn.textContent="Checking account…";
      try{
        const {data,error}=await supabaseClient.auth.signInWithPassword({email:$("#adminEmail").value.trim(),password:$("#adminPassword").value});
        if(error)throw error;
        const {data:adminRecord,error:adminError}=await supabaseClient.from("admin_users").select("user_id").eq("user_id",data.user.id).maybeSingle();
        if(adminError)throw adminError;
        if(!adminRecord){await supabaseClient.auth.signOut();activeAuthUser=null;throw new Error("This account does not have administrator permission.");}
        activeAuthUser=data.user;
        state.user={role:"admin",name:data.user.email};save();
        adminDashboard();
      }catch(err){msg.textContent=err.message||"Administrator sign in failed.";btn.disabled=false;btn.textContent="Sign in as administrator";}
    };
    return;
  }
  const {data:record,error}=await supabaseClient.from("admin_users").select("user_id").eq("user_id",activeAuthUser.id).maybeSingle();
  if(error||!record){activeAuthUser=null;adminLogin();return;}
  adminDashboard();
}
async function adminDashboard(){
  shell("Driver approval centre","Review driver registrations, approve trusted drivers, and control who can go online.",`
    <div class="stats">
      <div class="stat"><small>Driver applications</small><strong id="adminTotal">—</strong></div>
      <div class="stat"><small>Approved drivers</small><strong id="adminApproved">—</strong></div>
      <div class="stat"><small>Online drivers</small><strong id="adminOnline">—</strong></div>
    </div>
    <div class="tabs"><button class="tab active" id="refreshAdmin">Refresh applications</button><button class="tab" id="adminLogout">Sign out</button></div>
    <div id="realAdminList">Loading driver applications…</div>
    <div class="notice">Only this signed-in administrator account can approve drivers. Drivers cannot approve themselves.</div>`);
  $("#adminLogout").onclick=async()=>{await supabaseClient.auth.signOut();activeAuthUser=null;state.user=null;save();home();};
  $("#refreshAdmin").onclick=loadAdminDrivers;
  async function loadAdminDrivers(){
    const list=$("#realAdminList");list.textContent="Loading driver applications…";
    const [{data:driversData,error:driversError},{data:profilesData,error:profilesError}]=await Promise.all([
      supabaseClient.from("drivers").select("user_id,vehicle_type,vehicle_registration,verified,is_online").order("user_id"),
      supabaseClient.from("profiles").select("user_id,full_name,phone,account_type").eq("account_type","driver")
    ]);
    if(driversError||profilesError){list.textContent="Could not load applications: "+(driversError?.message||profilesError?.message);return;}
    const profiles=new Map((profilesData||[]).map(p=>[p.user_id,p]));
    const rows=(driversData||[]).map(d=>({ ...d, profile:profiles.get(d.user_id)||{} }));
    $("#adminTotal").textContent=rows.length;
    $("#adminApproved").textContent=rows.filter(d=>d.verified).length;
    $("#adminOnline").textContent=rows.filter(d=>d.is_online).length;
    if(!rows.length){list.innerHTML='<div class="empty">No driver applications have been submitted yet.</div>';return;}
    list.innerHTML=rows.map(d=>`
      <div class="ride-card">
        <div class="ride-top"><strong>${escapeHtml(d.profile.full_name||"Driver")}</strong><span class="status ${d.verified?"done":""}">${d.verified?"Approved":"Pending approval"}</span></div>
        <p>${escapeHtml(d.profile.phone||"No phone provided")} · ${escapeHtml(d.vehicle_type||"Vehicle not set")} · ${escapeHtml(d.vehicle_registration||"No registration")}</p>
        <p><small>Driver account: ${escapeHtml(d.user_id)}</small></p>
        <div class="button-row">
          <button class="small-btn good" data-approve-driver="${d.user_id}" data-approve-value="true" ${d.verified?"disabled":""}>Approve driver</button>
          <button class="small-btn" data-approve-driver="${d.user_id}" data-approve-value="false" ${!d.verified?"disabled":""}>Revoke approval</button>
          <button class="small-btn" data-online-driver="${d.user_id}" data-online-value="${d.is_online?"false":"true"}" ${!d.verified?"disabled":""}>${d.is_online?"Set offline":"Set online"}</button>
        </div>
      </div>`).join("");
    list.querySelectorAll("[data-approve-driver]").forEach(btn=>btn.onclick=async()=>{
      btn.disabled=true;
      const userId=btn.dataset.approveDriver,approved=btn.dataset.approveValue==="true";
      const {error}=await supabaseClient.from("drivers").update({verified:approved,is_online:false}).eq("user_id",userId);
      if(error){toast("Could not update approval: "+error.message);btn.disabled=false;return;}
      toast(approved?"Driver approved.":"Driver approval revoked.");
      await loadAdminDrivers();
    });
    list.querySelectorAll("[data-online-driver]").forEach(btn=>btn.onclick=async()=>{
      btn.disabled=true;
      const userId=btn.dataset.onlineDriver,online=btn.dataset.onlineValue==="true";
      const {error}=await supabaseClient.from("drivers").update({is_online:online}).eq("user_id",userId);
      if(error){toast("Could not update driver availability: "+error.message);btn.disabled=false;return;}
      toast(online?"Driver set online.":"Driver set offline.");
      await loadAdminDrivers();
    });
  }
  await loadAdminDrivers();
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
home();
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#installBtn").hidden=false;});
$("#installBtn").onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("#installBtn").hidden=true;};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));