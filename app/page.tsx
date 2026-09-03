"use client";

import {
  ArrowLeft, BookOpenCheck, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleHelp, CircleUserRound, House, ListChecks, MapPin, Pause, Play,
  PlayCircle, Plus, RotateCcw, ShieldCheck, Sparkles, UsersRound, Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

type Screen = "home" | "people" | "prepare" | "puja" | "complete";
type Person = { id: number; name: string; gotra: "known" | "unknown" | "unsure"; gotraName: string };

const materials = [
  "Ganesh idol or picture", "Lamp and oil or ghee", "Turmeric and kumkum",
  "Flowers", "Fruits or simple food offering", "Akshata (unbroken rice)",
  "Leaves that are safely available", "A small cup of clean water",
];

const steps = [
  { title: "Sit down and get ready", telugu: "పూజకు సిద్ధం అవ్వండి", instruction: "Sit comfortably near the puja place. Keep the materials within reach.", why: "This helps you continue without searching for things during the puja." },
  { title: "Light the lamp", telugu: "దీపం వెలిగించండి", instruction: "Light the lamp carefully. An adult should help children with fire.", why: "The lamp marks the beginning of worship and helps create a calm, focused space." },
  { title: "Begin with your intention", telugu: "సంకల్పం", instruction: "Your reviewed Sankalpam will appear here using only the participant details you provided.", why: "Sankalpam states who is performing the puja, where they are, and the purpose of the worship.", locked: true },
  { title: "Offer what you have", telugu: "యథాశక్తి సమర్పణ", instruction: "Offer the clean flowers, safe leaves or akshata you have. Do not use an unknown plant.", why: "Yathāśakti means doing the worship sincerely according to your ability and available means." },
  { title: "Offer food", telugu: "నైవేద్యం", instruction: "Place the prepared fruit, sweet or simple food in front of Ganesha.", why: "Naivedyam is food offered with gratitude before it is shared as prasadam." },
  { title: "Complete with prayer", telugu: "మంగళహారతి", instruction: "Complete the worship with the reviewed closing prayer and arati guidance.", why: "The closing prayer expresses gratitude and asks forgiveness for mistakes.", locked: true },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [language, setLanguage] = useState<"EN" | "TE">("EN");
  const [people, setPeople] = useState<Person[]>([{ id: 1, name: "Mahesh", gotra: "unknown", gotraName: "" }]);
  const [checked, setChecked] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vedasaarathi-progress");
    if (saved) {
      try { const data = JSON.parse(saved); setChecked(data.checked ?? []); setPeople(data.people ?? people); setStep(data.step ?? 0); } catch { /* ignore damaged local data */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vedasaarathi-progress", JSON.stringify({ checked, people, step }));
  }, [checked, people, step]);

  const goHome = () => { setScreen("home"); setShowWhy(false); setPlaying(false); };
  const addPerson = () => setPeople([...people, { id: Date.now(), name: "", gotra: "unknown", gotraName: "" }]);
  const updatePerson = (id: number, update: Partial<Person>) => setPeople(people.map((p) => p.id === id ? { ...p, ...update } : p));

  return <main className="app-shell"><section className="phone-shell">
    <header className="topbar">
      {screen === "home" ? <div className="brand-lockup"><div className="brand-mark" aria-hidden="true">ॐ</div><div><div className="brand-name">VedaSaarathi</div><button className="location-button" type="button"><MapPin size={14}/> Frisco, Texas <ChevronDown size={13}/></button></div></div> : <button className="back-button" onClick={screen === "people" ? goHome : () => setScreen(screen === "prepare" ? "home" : screen === "puja" ? "prepare" : "home")}><ArrowLeft size={20}/> Back</button>}
      <div className="language-toggle" aria-label="Language"><button className={language === "TE" ? "active" : ""} onClick={() => setLanguage("TE")}>తెలుగు</button><button className={language === "EN" ? "active" : ""} onClick={() => setLanguage("EN")}>EN</button></div>
    </header>

    {screen === "home" && <HomeScreen setScreen={setScreen} people={people} checked={checked.length}/>} 
    {screen === "people" && <PeopleScreen people={people} addPerson={addPerson} updatePerson={updatePerson} done={() => setScreen("prepare")}/>} 
    {screen === "prepare" && <PrepareScreen checked={checked} setChecked={setChecked} people={people} start={() => setScreen("puja")}/>} 
    {screen === "puja" && <PujaScreen step={step} setStep={setStep} showWhy={showWhy} setShowWhy={setShowWhy} playing={playing} setPlaying={setPlaying} finish={() => setScreen("complete")}/>} 
    {screen === "complete" && <CompleteScreen home={goHome}/>} 

    {screen === "home" && <nav className="bottom-nav" aria-label="Primary navigation"><button className="active"><House size={21}/><span>Home</span></button><button><CalendarDays size={21}/><span>Calendar</span></button><button onClick={() => setScreen("prepare")}><PlayCircle size={21}/><span>Puja</span></button><button onClick={() => setScreen("people")}><CircleUserRound size={21}/><span>Profile</span></button></nav>}
  </section></main>;
}

function HomeScreen({ setScreen, people, checked }: { setScreen: (s: Screen) => void; people: Person[]; checked: number }) {
  return <div className="content"><div className="welcome-row"><div><p className="kicker">NAMASKARAM</p><h1>Mahesh</h1><p className="welcome-copy">Here is what matters today.</p></div></div>
    <article className="today-card"><div className="card-heading-row"><div><p className="eyebrow">TODAY IN FRISCO</p><h2>Thursday, September 3</h2></div><div className="status-chip"><ShieldCheck size={14}/> Local</div></div><div className="panchanga-grid"><div><span>Tithi</span><strong>Being verified</strong></div><div><span>Nakshatra</span><strong>Being verified</strong></div><div><span>Sunrise</span><strong>Local time</strong></div></div><p className="plain-note">We will show these values only after the local calculation is checked.</p></article>
    <div className="section-title-row"><h2>Coming up</h2><button>View month</button></div>
    <article className="festival-card"><div className="festival-summary"><div className="festival-symbol"><Sparkles size={25}/></div><div className="festival-copy"><p className="eyebrow accent">MONDAY · SEP 14</p><h3>Vinayaka Chavithi</h3><p>Home puja for your location</p></div><div className="countdown"><strong>11</strong><span>days</span></div></div>
      <button className="participant-box full-button" onClick={() => setScreen("people")}><div><UsersRound size={18}/><span>{people.length === 1 ? "1 person" : `${people.length} people`} performing</span></div><span>Change <ChevronRight size={15}/></span></button>
      {checked > 0 && <div className="resume-line"><Check size={15}/> {checked} of {materials.length} items ready</div>}
      <div className="festival-actions"><button className="secondary-action" onClick={() => setScreen("people")}><UsersRound size={17}/> Add people</button><button className="primary-action" onClick={() => setScreen("prepare")}><ListChecks size={17}/> Get puja ready</button></div>
    </article>
    <div className="section-title-row"><h2>Quick access</h2></div><div className="quick-grid"><button><CalendarDays size={22}/><span>Festival calendar</span></button><button onClick={() => setScreen("prepare")}><BookOpenCheck size={22}/><span>My puja</span></button><button onClick={() => setScreen("people")}><UsersRound size={22}/><span>People</span></button></div>
  </div>;
}

function PeopleScreen({ people, addPerson, updatePerson, done }: { people: Person[]; addPerson: () => void; updatePerson: (id:number,u:Partial<Person>)=>void; done:()=>void }) {
  return <div className="flow-content"><p className="kicker">WHO IS PERFORMING?</p><h1>People joining the puja</h1><p className="flow-intro">Add each person. If you do not know a family detail, choose “I don’t know.” We will never guess it.</p>
    <div className="person-list">{people.map((person, index) => <article className="form-card" key={person.id}><h2>Person {index + 1}</h2><label>Name<input value={person.name} placeholder="Enter name" onChange={(e)=>updatePerson(person.id,{name:e.target.value})}/></label><label>Do you know the Gotra?<select value={person.gotra} onChange={(e)=>updatePerson(person.id,{gotra:e.target.value as Person["gotra"]})}><option value="known">Yes, I know it</option><option value="unknown">I don’t know</option><option value="unsure">I am not sure</option></select></label>{person.gotra === "known" && <label>Gotra name<input value={person.gotraName} placeholder="Enter exactly as you know it" onChange={(e)=>updatePerson(person.id,{gotraName:e.target.value})}/></label>}</article>)}</div>
    <button className="add-button" onClick={addPerson}><Plus size={18}/> Add another person</button><div className="safety-note"><ShieldCheck size={19}/><div><strong>Your details are used only when needed.</strong><p>Unknown information stays unknown. It will not be filled from surname, caste or location.</p></div></div><button className="wide-primary" onClick={done}>Save people and continue <ChevronRight size={18}/></button>
  </div>;
}

function PrepareScreen({ checked, setChecked, people, start }: { checked:number[]; setChecked:(v:number[])=>void; people:Person[]; start:()=>void }) {
  const toggle=(i:number)=>setChecked(checked.includes(i)?checked.filter(x=>x!==i):[...checked,i]);
  return <div className="flow-content"><p className="kicker">VINAYAKA CHAVITHI</p><h1>Get ready for the puja</h1><p className="flow-intro">Collect what you can. You do not need to stop the puja because every traditional item is not available.</p><div className="progress-label"><span>{checked.length} of {materials.length} ready</span><strong>{Math.round(checked.length/materials.length*100)}%</strong></div><div className="progress-track"><span style={{width:`${checked.length/materials.length*100}%`}}/></div>
    <div className="checklist">{materials.map((item,i)=><button className={checked.includes(i)?"checked":""} key={item} onClick={()=>toggle(i)}><span className="check-box">{checked.includes(i)&&<Check size={15}/>}</span><span>{item}</span></button>)}</div>
    <article className="simple-explanation"><CircleHelp size={21}/><div><h2>Cannot find all 21 leaves?</h2><p>Use the clean, safe leaves you can identify. If leaves are unavailable, the priest we consulted permits flowers or akshata. We are still checking the exact textual source, so the app will clearly label this as priest-reviewed practice.</p><strong>Never pick or offer a plant you cannot identify safely.</strong></div></article>
    <p className="participant-summary"><UsersRound size={17}/> Sankalpam will be prepared for {people.length} {people.length===1?"person":"people"}.</p><button className="wide-primary" onClick={start}><Play size={18}/> Start guided puja</button>
  </div>;
}

function PujaScreen({ step, setStep, showWhy, setShowWhy, playing, setPlaying, finish }: { step:number; setStep:(n:number)=>void; showWhy:boolean; setShowWhy:(b:boolean)=>void; playing:boolean; setPlaying:(b:boolean)=>void; finish:()=>void }) {
  const item=steps[step]; const next=()=>{setShowWhy(false);setPlaying(false);step===steps.length-1?finish():setStep(step+1)};
  return <div className="flow-content puja-flow"><div className="step-line"><span>Step {step+1} of {steps.length}</span><span>{Math.round((step+1)/steps.length*100)}%</span></div><div className="progress-track"><span style={{width:`${(step+1)/steps.length*100}%`}}/></div><article className="puja-card"><p className="telugu-title">{item.telugu}</p><h1>{item.title}</h1><p className="instruction">{item.instruction}</p>{item.locked && <div className="locked-note"><ShieldCheck size={18}/><span>The final words and audio stay locked until a qualified reviewer approves them.</span></div>}<button className="audio-button" disabled={item.locked} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={20}/>:<Volume2 size={20}/>} {item.locked?"Audio awaiting review":playing?"Pause explanation":"Listen to this step"}</button><button className="why-button" onClick={()=>setShowWhy(!showWhy)}><CircleHelp size={18}/> Why do we do this? <ChevronDown size={17}/></button>{showWhy&&<p className="why-copy">{item.why}</p>}</article><div className="step-actions"><button disabled={step===0} onClick={()=>{setStep(step-1);setShowWhy(false)}}>Previous</button><button className="primary-action" onClick={next}>{step===steps.length-1?"Complete puja":"Done, next"} <ChevronRight size={17}/></button></div></div>;
}

function CompleteScreen({ home }: {home:()=>void}) { return <div className="completion"><div className="completion-icon"><Check size={35}/></div><p className="kicker">PUJA COMPLETED</p><h1>Thank you for worshipping with sincerity.</h1><p>You followed the guidance according to your ability. May Sri Ganesha bless your family.</p><button className="wide-primary" onClick={home}><House size={18}/> Return home</button><button className="restart-button" onClick={()=>location.reload()}><RotateCcw size={16}/> Start again</button></div>; }
