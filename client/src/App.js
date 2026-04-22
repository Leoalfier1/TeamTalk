import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

// Components
import CreateModal from './components/CreateModal';
import JoinModal from './components/JoinModal';
import CreatePollModal from './components/CreatePollModal';
import Dashboard from './components/Dashboard';
import RoomCard from './components/RoomCard';

const socket = io.connect("http://localhost:5000");


function App() {
  // --- IDENTITY STATES (Persisted in LocalStorage) ---
  const [displayName, setDisplayName] = useState(localStorage.getItem("userName") || "");
  const [avatarColor, setAvatarColor] = useState(localStorage.getItem("userColor") || "#6366f1");

  // --- UI & ROOM STATES ---
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false); 
  const [step, setStep] = useState(1); 
  const [activeTab, setActiveTab] = useState("chat"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- DATA STATES ---
  const [roomCode, setRoomCode] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [polls, setPolls] = useState([]); 
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]); 
  const [summaryData, setSummaryData] = useState({ messages: [], polls: [], aiSummary: "" });
  const [canvasElements, setCanvasElements] = useState([]);

  // --- UTILITY STATES ---
  const [isRecording, setIsRecording] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const mediaRecorderRef = useRef(null);

  // --- DATA FETCHING & SOCKETS ---
// --- SINGLE CONSOLIDATED SOURCE OF TRUTH ---
  useEffect(() => {
    fetchRooms(); // Load dashboard data

    if (activeRoom) {
      const code = activeRoom.roomCode;

      // 1. Load historical data
      fetchPolls(code);
      fetchSummary(code);
      fetchCanvas(code);
      fetchChatHistory(code);

      // 2. Setup Socket Listeners (ONE TIME ONLY)
      socket.on("receive_message", (data) => {
    setChatLog((prev) => {
        // Check if the message is already on the screen (by ID)
        const isDuplicate = prev.some(m => m.id === data.id);
        if (isDuplicate) return prev; // If it's already there, do nothing
        return [...prev, data]; // If it's new, add it
    });
});


      socket.on("poll_updated", () => {
        fetchPolls(code);
        fetchSummary(code);
      });

      socket.on("element_received", (newEl) => {
        setCanvasElements((prev) => [...prev, newEl]);
      });

      socket.on("element_deleted", (data) => {
        setCanvasElements((prev) => prev.filter(el => el.id !== data.id));
      });
    }

    // 3. CLEANUP: This is vital. It removes listeners when you leave a room.
    return () => {
      socket.off("receive_message");
      socket.off("poll_updated");
      socket.off("element_received");
      socket.off("element_deleted");
    };
  }, [activeRoom]); // Runs only when entering or leaving a room

  const fetchRooms = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/rooms");
      setRooms(res.data);
    } catch (err) { console.error("Fetch Rooms failed", err); }
  };

  const fetchPolls = async (code) => {
    const res = await axios.get(`http://localhost:5000/api/polls/${code}`);
    setPolls(res.data);
  };

  const fetchSummary = async (code) => {
    const res = await axios.get(`http://localhost:5000/api/summary/${code}`);
    setSummaryData(res.data);
  };

  const fetchChatHistory = async (code) => {
    const res = await axios.get(`http://localhost:5000/api/messages/${code}`);
    setChatLog(res.data);
  };

  const fetchCanvas = async (code) => {
    const res = await axios.get(`http://localhost:5000/api/canvas/${code}`);
    setCanvasElements(res.data);
  };

  // --- HANDLERS ---
  const handleCreateRoom = async () => {
    const code = roomCode || "TT-" + Math.floor(1000 + Math.random() * 9000);
    const newRoom = {
      roomCode: code.toUpperCase(),
      title: roomTitle || "Untitled Project",
      ownerName: displayName || "Anonymous",
      avatarColor: avatarColor
    };

    localStorage.setItem("userName", displayName);
    localStorage.setItem("userColor", avatarColor); 
      
    try {
      await axios.post("http://localhost:5000/api/rooms", newRoom);
      setRoomCode(code.toUpperCase());
      setStep(3); 
      fetchRooms(); 
    } catch (err) { alert("Room creation failed"); }
  };

  // --- This function handles entering a room from the Dashboard ---
const enterRoom = (room) => {
    setChatLog([]);        // <--- ADD THIS: Clear old chat immediately
    setCanvasElements([]); // <--- ADD THIS: Clear old canvas immediately
    setActiveRoom(room);
    socket.emit("join_room", room.roomCode);
  };

  const handleJoinRoom = async () => {
    const res = await axios.get("http://localhost:5000/api/rooms");
    const found = res.data.find(r => r.roomCode.toUpperCase() === roomCode.toUpperCase());
    if (found) {
      localStorage.setItem("userName", displayName);
      localStorage.setItem("userColor", avatarColor);
      setActiveRoom(found);
      socket.emit("join_room", found.roomCode);
      setIsJoinModalOpen(false);
    } else { alert("Room code not found"); }
  };

const sendMessage = () => {
    if (message.trim()) {
      const msgData = { 
        id: Date.now() + Math.random(), // ID IS VITAL
        room: activeRoom.roomCode, 
        message: message, 
        user: displayName || "User", 
        color: avatarColor, 
        type: 'text' 
      };
      socket.emit("send_message", msgData);
      setChatLog((prev) => [...prev, msgData]);
      setMessage("");
    }
  };


 // --- UPLOAD HANDLER (Fixed for res and type errors) ---
  const handleUpload = async (e, uploadType = "file") => {
    let file;

    // A. Figure out if we got a click event or a raw file
    if (e.target && e.target.files) {
      file = e.target.files[0];
    } else {
      file = e;
    }

    if (!file) return;

    // B. Prepare the data for the server
    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomCode", activeRoom.roomCode);
    formData.append("user", displayName || "User");
    formData.append("color", avatarColor);
    formData.append("type", uploadType);

    try {
        // C. Send to server and wait for the response ('res')
        const res = await axios.post("http://localhost:5000/api/upload", formData);
        
        // D. Now that we have 'res', we can create the message
        const msgData = {
            id: Date.now() + Math.random(), // Unique ID to stop double-chatting
            room: activeRoom.roomCode,
            user: displayName || "User",
            type: uploadType,
            fileUrl: res.data.fileUrl, // Uses 'res' from the line above
            fileName: res.data.fileName, // Uses 'res' from the line above
            color: avatarColor
        };
        
        // E. Update UI and notify teammates
        socket.emit("send_message", msgData);
        setChatLog((prev) => [...prev, msgData]);

        if (e.target) e.target.value = null; // Clear the input

    } catch (err) {
        console.error("Upload failed", err);
        alert("Upload failed. Is the server running?");
    }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        let chunks = [];
        mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const file = new File([blob], "voice-note.webm");
            
            // Upload to server
            handleUpload(file, "voice");
            
            // Note: handleUpload already adds it to the chatLog locally
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) { console.error("Mic denied", err); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handleVote = async (optionId) => {
    await axios.post("http://localhost:5000/api/polls/vote", { optionId });
    socket.emit("update_poll", activeRoom.roomCode);
    fetchPolls(activeRoom.roomCode);
  };

  const handleLaunchPoll = async () => {
    if (!pollQuestion.trim()) return alert("Question required");
    try {
      await axios.post("http://localhost:5000/api/polls", { roomCode: activeRoom.roomCode, question: pollQuestion, options: pollOptions.filter(o => o !== "") });
      socket.emit("update_poll", activeRoom.roomCode);
      setPollQuestion(""); setPollOptions(["", ""]); setIsPollModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const deleteElement = async (id) => {
    await axios.delete(`http://localhost:5000/api/canvas/${id}`);
    setCanvasElements(canvasElements.filter(el => el.id !== id));
    socket.emit("element_deleted", { id, roomCode: activeRoom.roomCode });
  };

// A clean component to handle the overlapping user circles
const AvatarStack = ({ users }) => {
  const limit = 2; // Show 2 circles maximum
  const visible = users.slice(0, limit);
  const remaining = users.length > limit ? users.length - limit : 0;

  return (
    <div className="flex -space-x-3 items-center mr-6">
      {visible.map((u, i) => (
        <div 
          key={i} 
          title={u.name}
          className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-black uppercase shadow-sm transition-transform hover:-translate-y-1 cursor-help"
          style={{ backgroundColor: u.bg || '#E0E7FF', color: u.color || '#4F46E5', zIndex: 10 - i }}
        >
          {u.name[0]}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-9 h-9 rounded-full border-2 border-white bg-brand-500 flex items-center justify-center text-[10px] font-black text-white shadow-md z-0">
          +{remaining}
        </div>
      )}
    </div>
  );
};

const formatTime = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
};

  // --- VIEW 1: WORKSPACE ---
  if (activeRoom) {
    return (
      <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-20 shadow-sm shrink-0">
  {/* LEFT SIDE: Navigation & Project Info */}
  <div className="flex items-center gap-6">
    <button 
      onClick={() => setActiveRoom(null)} 
      className="w-10 h-10 flex items-center justify-center bg-brand-50 text-brand-500 rounded-xl hover:bg-brand-500 hover:text-white transition-all transform active:scale-90"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
    </button>
    
    <div className="h-10 w-[1px] bg-gray-100 mx-2 hidden md:block"></div>

    <div className="flex flex-col">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Website Design</p>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{activeRoom.title}</h2>
        <button 
          onClick={() => { navigator.clipboard.writeText(activeRoom.roomCode); alert("Copied to clipboard!"); }} 
          className="bg-slate-50 hover:bg-brand-50 text-gray-400 hover:text-brand-500 px-2.5 py-1 rounded-md text-[10px] font-black transition-all border border-transparent hover:border-brand-100 flex items-center gap-2 group"
        >
          {activeRoom.roomCode}
          <span className="group-hover:scale-110 transition-transform">📋</span>
        </button>
      </div>
    </div>
  </div>

  {/* RIGHT SIDE: Team & Personal Profile */}
  <div className="flex items-center gap-2">
    
    {/* Dynamic Team Stack (Using the function above) */}
    <AvatarStack 
      users={[
        { name: "Sarah", bg: "#DBEAFE", color: "#2563EB" },
        { name: "James", bg: "#DCFCE7", color: "#16A34A" },
        { name: "Maya", bg: "#FEF9C3", color: "#CA8A04" },
        { name: "Unknown", bg: "#F3F4F6", color: "#374151" }
      ]} 
    />

    <div className="h-8 w-[1px] bg-gray-100 mx-4"></div>

    {/* Personal Profile Badge */}
    <div className="flex items-center gap-3 bg-gray-50/80 pl-2 pr-4 py-1.5 rounded-full border border-gray-100 group cursor-default">
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-brand-500/20 transition-transform group-hover:rotate-12" 
        style={{ backgroundColor: avatarColor }}
      >
        YO
      </div>
      <div className="flex flex-col">
          <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-800 tracking-tight">{displayName || "You"}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse border border-white shadow-sm"></div>
          </div>
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Active Now</span>
      </div>
    </div>
  </div>
</header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 p-8 relative flex items-center justify-center">
            <div className="absolute top-8 bg-white px-6 py-3 rounded-full shadow-xl z-10 text-[10px] font-bold text-gray-400 uppercase italic">🕒 Drag elements from chat to canvas</div>
            <div className="w-full h-full bg-white rounded-4xl shadow-2xl border border-gray-100 relative overflow-hidden" 
                 style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 0)', backgroundSize: '24px 24px' }}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={async (e) => {
                    e.preventDefault();
                    const data = JSON.parse(e.dataTransfer.getData("itemData"));
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(e.clientX - rect.left - 80);
                    const y = Math.round(e.clientY - rect.top - 40);
                    const newEl = { roomCode: activeRoom.roomCode, url: data.url, x, y };
                    const res = await axios.post("http://localhost:5000/api/canvas", newEl);
                    newEl.id = res.data.id;
                    socket.emit("element_added", newEl);
                    setCanvasElements((prev) => [...prev, newEl]);
                 }}>
                 {canvasElements.map((el) => (
                    <div key={el.id} className="absolute p-2 bg-white shadow-xl border border-gray-100 rounded-xl group cursor-move" style={{ left: el.x, top: el.y }}>
                        <button onClick={() => deleteElement(el.id)} className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[10px]">✕</button>
                        <img src={el.url} alt="" className="w-40 rounded-lg pointer-events-none" />
                    </div>
                 ))}
            </div>
          </main>

         {/* --- SIDEBAR CONTAINER (Standardized, Collapsible & Fixes 404/Double-Send) --- */}
<aside className={`bg-white border-l border-gray-100 flex flex-col h-full transition-all duration-500 ease-in-out relative shadow-2xl z-30 ${isSidebarOpen ? 'w-[400px]' : 'w-20'}`}>
  
  {/* A. COLLAPSE TOGGLE BUTTON */}
  <button 
    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
    className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-100 rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-brand-500 z-50 transition-all hover:scale-110"
  >
    <svg className={`w-4 h-4 transition-transform duration-500 ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/>
    </svg>
  </button>

  {/* --- CONDITION 1: SIDEBAR IS OPEN --- */}
  {isSidebarOpen ? (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
        
        {/* 1. TAB NAVIGATION */}
        <div className="flex border-b border-gray-100 px-4 shrink-0 bg-white">
            {['chat', 'polls', 'summary'].map((tab) => (
            <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`flex-1 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                activeTab === tab ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
                }`}
            >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-t-full" />}
            </button>
            ))}
        </div>
        
        {/* 2. TAB CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-7 space-y-8 custom-scrollbar bg-[#FBFCFE]">
            
            {/* --- TAB: CHAT (Standardized Asset Widths) --- */}
            {activeTab === "chat" && (
    <div className="space-y-8 pb-10">
        {chatLog.map((msg, i) => {
            const isMe = msg.user === (displayName || "User");
            
            return (
                <div key={i} className="w-full flex flex-col">
                    
                    {/* UPDATED TIME SECTION */}
                    <div className={`flex items-center gap-2 mb-2 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest">
                            {isMe ? "You" : msg.user}
                        </span>
                        <span className="text-[8px] font-bold text-gray-300 uppercase">
                            {formatTime(msg.createdAt)} 
                        </span>
                    </div>
                                
                                {/* 1. TEXT BUBBLE */}
                    {msg.type === 'text' && (
                        <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`px-6 py-4 rounded-[2rem] text-sm shadow-sm max-w-[85%] break-words leading-relaxed ${
                                isMe ? "bg-brand-500 text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-700 rounded-tl-none"
                            }`}>
                                {msg.message}
                            </div>
                        </div>
                    )}
                                {msg.type === 'voice' && (
                                    <div className="bg-brand-500 p-6 rounded-[2rem] w-full flex items-center gap-5 shadow-xl shadow-brand-500/20 relative group">
                                        <button onClick={(e) => {
                                            const audio = e.currentTarget.closest('div').querySelector('audio');
                                            if (playingId === i) { audio.pause(); setPlayingId(null); } 
                                            else { audio.play(); setPlayingId(i); audio.onended = () => setPlayingId(null); }
                                        }} className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0 hover:bg-white/30 transition-all">
                                            {playingId === i ? "⏸" : "▶"}
                                        </button>
                                        <audio src={msg.fileUrl} preload="auto" />
                                        <div className="flex items-end gap-1.5 h-8 flex-1">
                                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(v => <div key={v} className={`w-1 bg-white/40 rounded-full ${playingId === i ? "animate-pulse" : ""}`} style={{ height: `${20 + Math.random() * 80}%` }}></div>)}
                                        </div>
                                    </div>
                                )}

                                {msg.type === 'file' && (
                                    <div draggable="true" onDragStart={(e) => e.dataTransfer.setData("itemData", JSON.stringify({ url: msg.fileUrl, name: msg.fileName }))} className="group relative bg-white border border-gray-100 rounded-[2.5rem] shadow-sm w-full cursor-grab hover:border-brand-500 transition-all overflow-hidden">
                                        <div className="relative h-44 w-full bg-slate-50 flex items-center justify-center border-b border-gray-50 overflow-hidden">
                                            <img src={msg.fileUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                                                <span className="bg-brand-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all">Drag to Canvas</span>
                                            </div>
                                        </div>
                                        <div className="p-5 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-lg shrink-0">🖼️</div>
                                            <div className="flex-1 overflow-hidden"><p className="text-[12px] font-black text-gray-800 truncate leading-none mb-1">{msg.fileName}</p><p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">1.2MB • Image</p></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- TAB: POLLS (Strictly Polls Only) --- */}
            {activeTab === "polls" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {polls.map((poll) => (
                        <div key={poll.id} className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="font-extrabold text-[15px] text-gray-800 leading-snug pr-8">{poll.question}</h4>
                                <span className="bg-green-100 text-green-600 text-[9px] font-black px-3 py-1 rounded-full uppercase shrink-0">● Live</span>
                            </div>
                            <div className="space-y-3">
                                {poll.options.map(opt => {
                                    const total = poll.options.reduce((s, o) => s + o.votes, 0);
                                    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                                    return (
                                        <button key={opt.id} onClick={() => handleVote(opt.id)} className="w-full text-left p-5 rounded-2xl text-[12px] font-bold border border-gray-50 hover:border-brand-200 transition-all relative overflow-hidden">
                                            <div className="absolute inset-0 bg-brand-50 transition-all duration-700" style={{ width: `${pct}%`, opacity: 0.5 }}></div>
                                            <div className="relative flex justify-between items-center"><span className="text-gray-600">{opt.optionText}</span><span className="text-brand-600 font-black">{pct}%</span></div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setIsPollModalOpen(true)} className="w-full py-8 border-2 border-dashed border-brand-100 text-brand-500 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-brand-50 transition-all flex items-center justify-center gap-3">+ Create New Poll</button>
                </div>
            )}

            {/* --- TAB: SUMMARY (AI Smart Logic) --- */}
            {activeTab === "summary" && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-br from-brand-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-500/20">
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <span className="text-lg">✨</span>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">AI Smart Summary</h3>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-indigo-50 relative z-10">
                            {summaryData.aiSummary || "Analyzing the last 12 hours... Your team is discussing design assets. Sarah shared a visual guide, and the current poll favors the 'Indigo' theme."}
                        </p>
                    </div>

                    <section>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Recent Activity Timeline</h3>
                        <div className="space-y-4">
                            {summaryData.messages.slice(0, 3).map((m, i) => (
                                <div key={i} className="flex gap-4 items-center p-5 bg-white rounded-[1.5rem] border border-gray-50 shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-bold text-brand-500 uppercase shrink-0">{m.user[0]}</div>
                                    <p className="text-xs text-gray-600 font-medium"><span className="font-black text-gray-900">{m.user}</span> {m.type === 'file' ? `added an asset.` : `contributed to the design chat.`}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>

        {/* 3. SHARED CHAT FOOTER (Only in Chat Tab) */}
        {activeTab === "chat" && (
            <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                <div className="flex items-center gap-3 bg-[#F8F9FD] p-2 rounded-2xl border border-gray-100">
                    <label className="p-3 text-gray-400 hover:text-brand-500 cursor-pointer transition">
                        📎 <input type="file" className="hidden" onChange={(e) => handleUpload(e)} />
                    </label>
                    <input type="text" className="flex-1 bg-transparent py-3 text-sm outline-none font-medium text-gray-600" placeholder="Message team..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
                    <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-white text-gray-400 shadow-sm"}`}>🎤</button>
                    <button onClick={sendMessage} className="w-12 h-12 bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/30 flex items-center justify-center hover:bg-brand-600 transition">➔</button>
                </div>
            </div>
        )}
    </div>
  ) : (
    /* --- CONDITION 2: SIDEBAR IS COLLAPSED (Icon Bar) --- */
<div className="flex flex-col items-center py-12 gap-10 h-full bg-white animate-in fade-in duration-500">
    
    {/* 1. CHAT ICON (With Notification Dot) */}
    <button 
        onClick={() => { setIsSidebarOpen(true); setActiveTab('chat'); }}
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group ${activeTab === 'chat' ? 'bg-brand-50 text-brand-500' : 'text-gray-300 hover:text-brand-500 hover:bg-gray-50'}`}
    >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {/* The Blue Notification Dot from your image */}
        <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-white shadow-sm shadow-brand-500/50"></div>
    </button>

    {/* 2. POLLS ICON */}
    <button 
        onClick={() => { setIsSidebarOpen(true); setActiveTab('polls'); }}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group ${activeTab === 'polls' ? 'bg-brand-50 text-brand-500' : 'text-gray-300 hover:text-brand-500 hover:bg-gray-50'}`}
    >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    </button>

    {/* 3. SUMMARY ICON (AI Sparkles) */}
    <button 
        onClick={() => { setIsSidebarOpen(true); setActiveTab('summary'); }}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group ${activeTab === 'summary' ? 'bg-brand-50 text-brand-500' : 'text-gray-300 hover:text-brand-500 hover:bg-gray-50'}`}
    >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    </button>

    {/* Footer Avatar */}
    <div className="mt-auto pb-8">
         <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-xl ring-4 ring-gray-50 transition-transform hover:scale-110 cursor-pointer" 
            style={{ backgroundColor: avatarColor }}
         >
            YO
         </div>
    </div>
</div>
  )}
</aside>
        </div>

        <CreatePollModal isOpen={isPollModalOpen} onClose={() => setIsPollModalOpen(false)} question={pollQuestion} setQuestion={setPollQuestion} options={pollOptions} setOptions={setPollOptions} handleLaunch={handleLaunchPoll} />
      </div>
    );
  }

  // --- VIEW 2: DASHBOARD ---
  return (
    <>
      <Dashboard 
        rooms={rooms}
        displayName={displayName}
        setIsCreateModalOpen={setIsCreateModalOpen}
        setIsJoinModalOpen={setIsJoinModalOpen}
        setStep={setStep}
        setRoomCode={setRoomCode}
        onJoinRoom={enterRoom}
      />

      <CreateModal 
        isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setStep(1); }}
        step={step} setStep={setStep}
        roomTitle={roomTitle} setRoomTitle={setRoomTitle}
        displayName={displayName} setDisplayName={setDisplayName}
        avatarColor={avatarColor} setAvatarColor={setAvatarColor}
        roomCode={roomCode} setRoomCode={setRoomCode}
        handleCreate={handleCreateRoom}
      />

      <JoinModal 
        isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)}
        roomCode={roomCode} setRoomCode={setRoomCode}
        displayName={displayName} setDisplayName={setDisplayName}
        avatarColor={avatarColor} setAvatarColor={setAvatarColor}
        handleJoin={handleJoinRoom}
      />
    </>
  );
}

export default App;