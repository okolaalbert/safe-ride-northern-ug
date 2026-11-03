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
app.querySelectorAll("[data-role]").forEach(b=>b.onclick=()=>b.dataset.role==="admin"?admin():authGate(b.dataset.role));}
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
    const {data,error}=await supabaseClient.from("rides").select("id,pickup,destination,vehicle_type,estimated_fare,status,created_at").eq("passenger_id",activeAuthUser.id).order("created_at",{ascending:false});
    if(error){el.textContent="Could not load rides: "+error.message;return;}
    el.innerHTML=data.length?data.map(r=>rideHtml({id:String(r.id),type:r.vehicle_type==="boda"?"Boda-boda":"Taxi",from:r.pickup,to:r.destination,amount:r.estimated_fare,status:r.status})).join(""):'<div class="empty">You have not requested a ride yet.</div>';
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
        pickup:from,
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
function driver(){shell("Driver workspace","Register a demo driver profile and manage sample ride requests.",`
<div class="form-grid"><div class="field"><label>Driver name</label><input id="dname" placeholder="Your name"></div><div class="field"><label>Phone number</label><input id="dphone" placeholder="+256 7XX XXX XXX"></div><div class="field"><label>Vehicle</label><select id="dtype"><option>Boda-boda</option><option>Taxi</option></select></div><div class="field"><label>Operating town</label><input id="town" placeholder="e.g. Gulu"></div></div><button class="primary-btn wide" id="registerDriver">Save demo driver profile</button><div class="notice">Real driver identity checks, licence verification, and approval workflows must be connected to a secure backend before launch.</div><div class="tabs"><button class="tab active">Available demo requests</button></div><div id="driverRides"></div>`);
$("#registerDriver").onclick=()=>{const name=$("#dname").value.trim(),phone=$("#dphone").value.trim();if(!name||!phone){toast("Enter driver name and phone.");return;}state.user={role:"driver",name,phone,vehicle:$("#dtype").value,town:$("#town").value.trim()};if(!state.drivers.some(d=>d.phone===phone))state.drivers.push({...state.user,approved:false,online:true});save();toast("Demo driver profile saved.");renderDriverRides();};
function renderDriverRides(){const el=$("#driverRides");if(!el)return;const pending=state.rides.filter(r=>r.status==="Searching for driver");el.innerHTML=pending.length?pending.map(r=>`<div class="ride-card"><div class="ride-top"><strong>${r.id} · ${r.type}</strong><span class="status">New request</span></div><p>${r.from} → ${r.to}</p><div class="ride-top"><small>${r.passenger}</small><strong>${money(r.amount)}</strong></div><div class="button-row"><button class="small-btn good" data-accept="${r.id}">Accept</button><button class="small-btn" data-reject="${r.id}">Skip</button></div></div>`).join(""):'<div class="empty">No unassigned demo rides right now.</div>';el.querySelectorAll("[data-accept]").forEach(b=>b.onclick=()=>{if(!state.user||state.user.role!=="driver"){toast("Save your driver profile first.");return;}const r=state.rides.find(x=>x.id===b.dataset.accept);r.status="Driver assigned";r.driver=state.user.name;save();renderDriverRides();toast("Demo ride accepted.");});el.querySelectorAll("[data-reject]").forEach(b=>b.onclick=()=>{toast("Request skipped in this demo.");});}
renderDriverRides();}
function admin(){shell("Admin overview","Sample platform activity stored only in this browser. This is not a secured admin console.",`
<div class="stats"><div class="stat"><small>Demo rides</small><strong id="sRides">0</strong></div><div class="stat"><small>Driver profiles</small><strong id="sDrivers">0</strong></div><div class="stat"><small>Completed trips</small><strong id="sDone">0</strong></div></div><div class="tabs"><button class="tab active" id="tabRides">Ride requests</button><button class="tab" id="tabDrivers">Drivers</button></div><div id="adminList"></div><div class="notice">Production admin access must be protected by server-side roles and authentication. This local demo panel has no real security and must not be used to monitor real customers.</div>`);
$("#sRides").textContent=state.rides.length;$("#sDrivers").textContent=state.drivers.length;$("#sDone").textContent=state.rides.filter(r=>r.status==="Completed").length;
const rides=()=>{$("#adminList").innerHTML=state.rides.length?state.rides.slice().reverse().map(r=>`<div class="ride-card"><div class="ride-top"><strong>${r.id} · ${r.type}</strong><span class="status ${r.status==="Completed"?"done":""}">${r.status}</span></div><p>${r.passenger}: ${r.from} → ${r.to}</p><div class="ride-top"><small>${r.driver||"No driver assigned"}</small><strong>${money(r.amount)}</strong></div><div class="button-row"><button class="small-btn" data-complete="${r.id}">Mark completed</button><button class="small-btn" data-cancel="${r.id}">Cancel</button></div></div>`).join(""):'<div class="empty">No demo rides have been requested yet.</div>';$("#adminList").querySelectorAll("[data-complete]").forEach(b=>b.onclick=()=>changeRide(b.dataset.complete,"Completed"));$("#adminList").querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>changeRide(b.dataset.cancel,"Cancelled"));};
const drivers=()=>{$("#adminList").innerHTML=state.drivers.length?state.drivers.map(d=>`<div class="ride-card"><div class="ride-top"><strong>${d.name}</strong><span class="status ${d.approved?"done":""}">${d.approved?"Approved demo":"Pending review"}</span></div><p>${d.vehicle} · ${d.town||"Town not set"} · ${d.phone}</p><button class="small-btn good" data-approve="${d.phone}">Toggle demo approval</button></div>`).join(""):'<div class="empty">No demo driver profiles yet.</div>';$("#adminList").querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>{const d=state.drivers.find(x=>x.phone===b.dataset.approve);d.approved=!d.approved;save();drivers();});};
function changeRide(id,status){const r=state.rides.find(x=>x.id===id);if(r){r.status=status;save();$("#sDone").textContent=state.rides.filter(x=>x.status==="Completed").length;rides();toast("Demo ride updated.");}}
$("#tabRides").onclick=()=>{$("#tabRides").classList.add("active");$("#tabDrivers").classList.remove("active");rides();};$("#tabDrivers").onclick=()=>{$("#tabDrivers").classList.add("active");$("#tabRides").classList.remove("active");drivers();};rides();}
home();
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#installBtn").hidden=false;});
$("#installBtn").onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("#installBtn").hidden=true;};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));