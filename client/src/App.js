import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import CreateModal from './components/CreateModal';
import JoinModal from './components/JoinModal';
import CreatePollModal from './components/CreatePollModal';
import Dashboard from './components/Dashboard';


// Import our new component
import RoomCard from './components/RoomCard';

const socket = io.connect("http://localhost:5000");


function App() {
  // --- STATES ---
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false); 
  const [step, setStep] = useState(1); // For the 3-step Create Modal

  const [displayName, setDisplayName] = useState(localStorage.getItem("userName") || "");
  const [avatarColor, setAvatarColor] = useState(localStorage.getItem("userColor") || "#6366f1");
  const [roomCode, setRoomCode] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [activeTab, setActiveTab] = useState("chat"); 
  const [polls, setPolls] = useState([]); 
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]); 

  const [summaryData, setSummaryData] = useState({ messages: [], polls: [] });
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const [canvasElements, setCanvasElements] = useState([]);

  const [playingId, setPlayingId] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


// --- SINGLE CONSOLIDATED FETCHING LOGIC ---
  useEffect(() => {
    // Always fetch rooms for the dashboard
    fetchRooms();

    if (activeRoom) {
      const code = activeRoom.roomCode;
      
      // 1. Initial Load of all room data
      fetchPolls(code);
      fetchSummary(code);
      fetchCanvas(code);
      fetchChatHistory(code);

      // 2. Setup Socket Listeners
      socket.on("receive_message", (data) => setChatLog((prev) => [...prev, data]));
      
      socket.on("poll_updated", () => {
        fetchPolls(code);
        fetchSummary(code);
      });

      socket.on("element_received", (newEl) => {
        setCanvasElements((prev) => [...prev, newEl]);
      });
    }

    // 3. Cleanup to prevent memory leaks and double-listeners
    return () => {
      socket.off("receive_message");
      socket.off("poll_updated");
      socket.off("element_received");
    };
  }, [activeRoom]); // Only runs when entering/leaving a room


  
  const fetchRooms = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/rooms");
      setRooms(res.data);
    } catch (err) { console.error(err); }
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

// Add this helper function at the top of your handlers
  const fetchCanvas = async (code) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/canvas/${code}`);
      setCanvasElements(res.data);
    } catch (err) {
      console.error("Could not load canvas", err);
    }
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

      localStorage.setItem("userColor", avatarColor); 
      
    try {
      await axios.post("http://localhost:5000/api/rooms", newRoom);
      setRoomCode(code.toUpperCase());
      setStep(3); 
      fetchRooms(); 
    } catch (err) { 
      // Change this line to see the real error
      console.error("The error is:", err);
      alert("Error: " + (err.response?.data?.message || err.message)); 
    }
  };

    const enterRoom = (room) => {
    setActiveRoom(room);
    socket.emit("join_room", room.roomCode);
    fetchCanvas(room.roomCode);
    fetchChatHistory(room.roomCode);
    fetchPolls(room.roomCode);
    fetchSummary(room.roomCode);
};


  const handleJoinRoom = async () => {
    const res = await axios.get("http://localhost:5000/api/rooms");
    const found = res.data.find(r => r.roomCode.toUpperCase() === roomCode.toUpperCase());
    if (found) {
      setActiveRoom(found);
      socket.emit("join_room", found.roomCode);
      setIsJoinModalOpen(false);
      fetchPolls(found.roomCode);
      fetchChatHistory(found.roomCode);
    } else { alert("Not found"); }
  };

  // Add this function to handle voting
  const handleVote = async (optionId) => {

 localStorage.setItem("userName", displayName);

    try {
      // 1. Tell the backend to add a vote to this option
      await axios.post("http://localhost:5000/api/polls/vote", { optionId });
      
      // 2. Tell everyone else in the room (via Sockets) to refresh their polls
      socket.emit("update_poll", activeRoom.roomCode);
      
      // 3. Refresh our own local data
      fetchPolls(activeRoom.roomCode);
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const handleLaunchPoll = async () => {
    // 1. Validation: Make sure they wrote a question and at least 2 options
    if (!pollQuestion.trim() || pollOptions.some(opt => opt.trim() === "")) {
      return alert("Please fill in the question and all options!");
    }

    try {
      // 2. Save the poll to the database via your API
      await axios.post("http://localhost:5000/api/polls", {
        roomCode: activeRoom.roomCode,
        question: pollQuestion,
        options: pollOptions.filter(opt => opt.trim() !== "") // Remove empty options
      });

      // 3. Tell everyone in the room a new poll is ready
      socket.emit("update_poll", activeRoom.roomCode);

      // 4. Reset everything and close the modal
      setPollQuestion("");
      setPollOptions(["", ""]);
      setIsPollModalOpen(false);
      
      // 5. Refresh the list so the creator sees the new poll immediately
      fetchPolls(activeRoom.roomCode);
    } catch (err) {
      console.error("Error launching poll:", err);
      alert("Failed to launch poll. Check console for details.");
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      const msgData = { room: activeRoom.roomCode, message, user: displayName || "User", color: avatarColor, type: 'text' };
      socket.emit("send_message", msgData);
      setChatLog((prev) => [...prev, msgData]);
      setMessage("");
    }
  };

  // --- UPLOAD HANDLER ---
// --- UPDATED UPLOAD HANDLER ---
  const handleUpload = async (e, type = "file") => {
    let file;

    // Check if 'e' is an Event from an input or a direct File object
    if (e.target && e.target.files) {
      file = e.target.files[0]; // It's from the paperclip button
    } else {
      file = e; // It's a direct file (like a voice note)
    }

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomCode", activeRoom.roomCode);
    formData.append("user", displayName || "User");
    formData.append("color", avatarColor);
    formData.append("type", type);

    try {
        const res = await axios.post("http://localhost:5000/api/upload", formData);
        
        const msgData = {
            room: activeRoom.roomCode,
            user: displayName || "User",
            type: type,
            fileUrl: res.data.fileUrl,
            fileName: res.data.fileName,
            color: avatarColor
        };
        
        socket.emit("send_message", msgData);
        setChatLog((prev) => [...prev, msgData]);

        // Clear the input if it was a file input
        if (e.target) e.target.value = null;

    } catch (err) {
        console.error("Upload failed", err);
    }
  };

  // --- VOICE RECORDING HANDLERS ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        let chunks = [];
        mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const file = new File([blob], "voice-note.webm", { type: 'audio/webm' });
            handleUpload(file, "voice"); // Reuse the upload function but set type to "voice"
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) { console.error("Microphone access denied", err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };
  
  const addToCanvas = (fileUrl, fileName) => {
    const newElement = {
        id: Date.now(),
        url: fileUrl,
        name: fileName,
        x: 100 + (canvasElements.length * 20), // Spawns them slightly offset
        y: 100 + (canvasElements.length * 20)
    };
    setCanvasElements([...canvasElements, newElement]);
};

  // --- UI VIEW 1: THE COLLABORATIVE WORKSPACE (Image 1, 3, 10) ---
  if (activeRoom) {
    return (
      <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
        {/* TOP HEADER (Image 10) */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-20 shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveRoom(null)} className="w-10 h-10 flex items-center justify-center bg-brand-50 text-brand-500 rounded-xl hover:bg-brand-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Website Design</p>
              <h2 className="text-lg font-extrabold text-gray-800">{activeRoom.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Simple User List (Image 1) */}
             <div className="flex -space-x-2 mr-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">S</div>
                <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-green-600">J</div>
                <div className="w-8 h-8 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">+2</div>
             </div>
             <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
             {/* Find the section that says "YO" and update the style attribute */}
<div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
    <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
        style={{ backgroundColor: avatarColor }} // THIS MAKES IT FUNCTIONAL
    >
        YO
    </div>
    <span className="text-sm font-bold text-gray-700">You</span>
    <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
</div>
          </div>
        </header>

        

        <div className="flex-1 flex overflow-hidden">
{/* THE CANVAS */}
<div 
  className="w-full h-full bg-white rounded-4xl shadow-2xl border border-gray-100 relative overflow-hidden cursor-crosshair" 
  style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 0)', backgroundSize: '24px 24px' }}
  
  // 1. This allows the browser to accept a drop
  onDragOver={(e) => e.preventDefault()} 
  
  // 2. This is the main logic when you release the mouse
  onDrop={async (e) => {
    e.preventDefault();
    
    // Get the data we "packed" in the Chat card
    const data = JSON.parse(e.dataTransfer.getData("itemData"));
    
    // Calculate exact coordinates relative to the canvas
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left - 80);
    const y = Math.round(e.clientY - rect.top - 40);

    const newElement = { 
      roomCode: activeRoom.roomCode, 
      url: data.url, 
      x: x, 
      y: y 
    };

    try {
      // Step A: Save to MySQL so it's there after refresh
      await axios.post("http://localhost:5000/api/canvas", newElement);

      // Step B: Tell everyone else in the room to show this image
      socket.emit("element_added", newElement);

      // Step C: Update your own screen
      setCanvasElements((prev) => [...prev, newElement]);
    } catch (err) {
      console.error("Failed to save element", err);
    }
  }}
>
     {/* Render the saved elements */}
     {canvasElements.map((el, index) => (
       <div 
         key={el.id || index} 
         className="absolute p-2 bg-white shadow-xl border border-gray-100 rounded-xl animate-in zoom-in duration-300" 
         style={{ left: el.x, top: el.y }}
       >
         <img src={el.url} alt="" className="w-40 rounded-lg pointer-events-none" />
       </div>
     ))}
</div>



{/* workspace */}
{/* SIDEBAR CONTAINER (Image 3, 4, 10 - Standardized & Collapsible) */}
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
                <div className="space-y-8">
                    {chatLog.map((msg, i) => (
                        <div key={i} className="w-full flex flex-col">
                            <span className={`text-[9px] font-black text-gray-300 uppercase mb-2 tracking-widest px-1 ${msg.user === (displayName || "User") ? "text-right" : "text-left"}`}>
                                {msg.user} • 10:42 am
                            </span>
                            
                            {/* Text UI */}
                            {msg.type === 'text' && (
                                <div className={`flex w-full ${msg.user === (displayName || "User") ? "justify-end" : "justify-start"}`}>
                                    <div className={`px-6 py-4 rounded-[1.5rem] text-sm shadow-sm max-w-[85%] break-words leading-relaxed ${msg.user === (displayName || "User") ? "bg-brand-500 text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-700 rounded-tl-none"}`}>
                                        {msg.message}
                                    </div>
                                </div>
                            )}

                            {/* Voice UI (Poll-style consistency) */}
                            {msg.type === 'voice' && (
                                <div className="bg-brand-500 p-6 rounded-[2rem] w-full flex items-center gap-5 shadow-xl shadow-brand-500/20">
                                    <button onClick={(e) => {
                                        const audio = e.currentTarget.parentElement.querySelector('audio');
                                        if (playingId === i) { audio.pause(); setPlayingId(null); } 
                                        else { audio.play(); setPlayingId(i); audio.onended = () => setPlayingId(null); }
                                    }} className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0 hover:bg-white/30 transition-all">
                                        {playingId === i ? "⏸" : "▶"}
                                    </button>
                                    <audio src={msg.fileUrl} />
                                    <div className="flex items-end gap-1.5 h-8 flex-1">
                                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(v => <div key={v} className={`w-1 bg-white/40 rounded-full ${playingId === i ? "animate-pulse" : ""}`} style={{ height: `${20 + Math.random() * 80}%` }}></div>)}
                                    </div>
                                </div>
                            )}

                            {/* File UI (Poll-style consistency) */}
                            {msg.type === 'file' && (
                                <div draggable="true" onDragStart={(e) => e.dataTransfer.setData("itemData", JSON.stringify({ url: msg.fileUrl, name: msg.fileName }))} className="group relative bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-5 w-full cursor-grab hover:border-brand-500 transition-all">
                                    <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 rounded-[2rem] flex items-center justify-center pointer-events-none transition-opacity">
                                        <span className="bg-brand-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all">Drag to Canvas</span>
                                    </div>
                                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-500">🖼️</div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[12px] font-black text-gray-800 truncate mb-1">{msg.fileName}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">1.2MB • PNG</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* --- TAB: POLLS (Strictly Polls Only) --- */}
            {activeTab === "polls" && (
                <div className="space-y-6">
                    {polls.map((poll) => (
                        <div key={poll.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
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
                <div className="space-y-10">
                    <div className="bg-gradient-to-br from-brand-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-500/20 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <span className="text-lg">✨</span>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">AI Smart Summary</h3>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-indigo-50 relative z-10">
                            {summaryData.aiSummary || "Analyzing the last 12 hours... Your team is discussing design assets. Sarah shared a visual guide, and the current poll favors the 'Indigo' theme."}
                        </p>
                    </div>

                    <section>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Recent Timeline</h3>
                        <div className="space-y-4">
                            {summaryData.messages.slice(0, 3).map((m, i) => (
                                <div key={i} className="flex gap-4 items-center p-5 bg-white rounded-[1.5rem] border border-gray-50">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-bold text-brand-500 uppercase">{m.user[0]}</div>
                                    <p className="text-xs text-gray-600 font-medium"><span className="font-black text-gray-900">{m.user}</span> {m.type === 'file' ? `added an asset.` : `joined the discussion.`}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>

        {/* 3. SHARED CHAT FOOTER */}
        {activeTab === "chat" && (
            <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                <div className="flex items-center gap-3 bg-[#F8F9FD] p-2 rounded-2xl border border-gray-100">
                    <label className="p-3 text-gray-400 hover:text-brand-500 cursor-pointer transition">
                        📎<input type="file" className="hidden" onChange={(e) => handleUpload(e)} />
                    </label>
                    <input type="text" className="flex-1 bg-transparent py-3 text-sm outline-none font-medium text-gray-600 placeholder:text-gray-300" placeholder="Message team..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
                    <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-white text-gray-400 shadow-sm"}`}>🎤</button>
                    <button onClick={sendMessage} className="w-12 h-12 bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/30 flex items-center justify-center hover:bg-brand-600 transition">➔</button>
                </div>
            </div>
        )}
    </div>
  ) : (
    /* --- CONDITION 2: SIDEBAR IS COLLAPSED (Icon Bar) --- */
    <div className="flex flex-col items-center py-10 gap-8 h-full animate-in fade-in duration-500">
        {['chat', 'polls', 'summary'].map((tab, idx) => (
            <button 
                key={tab} 
                onClick={() => { setIsSidebarOpen(true); setActiveTab(tab); }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === tab ? 'bg-brand-50 text-brand-500 shadow-sm' : 'text-gray-300 hover:text-brand-500'}`}
            >
                {idx === 0 && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>}
                {idx === 1 && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>}
                {idx === 2 && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
            </button>
        ))}
        <div className="mt-auto pb-6">
             <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xl">YO</div>
        </div>
    </div>
  )}
</aside>
        </div>

        <CreatePollModal 
  isOpen={isPollModalOpen}
  onClose={() => setIsPollModalOpen(false)}
  question={pollQuestion}
  setQuestion={setPollQuestion}
  options={pollOptions}
  setOptions={setPollOptions}
  handleLaunch={handleLaunchPoll}
/>

      </div>
    );
  }
  






















  // --- THIS IS THE BOTTOM OF YOUR App.js ---

  // --- UI VIEW 2: THE DASHBOARD (The part you replace) ---
  return (
    <>
      {/* 1. The Dashboard handles the Sidebar and Grids */}
      <Dashboard 
        rooms={rooms}
        displayName={displayName || "Anonymous"}
        setIsCreateModalOpen={setIsCreateModalOpen}
        setIsJoinModalOpen={setIsJoinModalOpen}
        setStep={setStep}
        setRoomCode={setRoomCode}
        onJoinRoom={(room) => {
            setActiveRoom(room);
            socket.emit("join_room", room.roomCode);
            fetchCanvas(room.roomCode);
            fetchChatHistory(room.roomCode);
            fetchPolls(room.roomCode);
            fetchSummary(room.roomCode);
        }}
      />

      {/* 2. CREATE ROOM MODAL (With the new Project Name logic) */}
      <CreateModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        step={step} 
        setStep={setStep}
        roomTitle={roomTitle}        
        setRoomTitle={setRoomTitle}  
        displayName={displayName} 
        setDisplayName={setDisplayName}
        avatarColor={avatarColor} 
        setAvatarColor={setAvatarColor}
        roomCode={roomCode} 
        setRoomCode={setRoomCode}
        handleCreate={handleCreateRoom}
      />

      {/* 3. JOIN ROOM MODAL */}
      <JoinModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)}
        roomCode={roomCode} 
        setRoomCode={setRoomCode}
        displayName={displayName} 
        setDisplayName={setDisplayName}
        avatarColor={avatarColor} 
        setAvatarColor={setAvatarColor}
        handleJoin={handleJoinRoom}
      />
    </>
  );
} // This is the very last closing bracket of your App function

export default App;