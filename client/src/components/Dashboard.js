import React from 'react';
import RoomCard from './RoomCard';

const Dashboard = ({ 
    rooms, 
    displayName, 
    setIsCreateModalOpen, 
    setIsJoinModalOpen, 
    setStep, 
    setRoomCode,
    onJoinRoom 
}) => {
    
    // --- PERSISTENCE LOGIC ---
    // We normalize the name to ensure "Alex" matches "alex" or "ALEX"
    const currentUser = (displayName || "").trim().toLowerCase();

    // Filter rooms based on strict ownership
    const myDesigns = rooms.filter(r => 
        (r.ownerName || "").trim().toLowerCase() === currentUser
    );

    // Filter rooms where you are a collaborator (not the owner)
    const joinedRooms = rooms.filter(r => 
        (r.ownerName || "").trim().toLowerCase() !== currentUser
    );

    // Get color from memory for the top-right profile
    const userColor = localStorage.getItem("userColor") || "#6366f1";

    return (
        <div className="flex min-h-screen bg-white font-sans overflow-hidden">
            
            {/* 1. LEFT NAVIGATION SIDEBAR (Image 5 style) */}
            <aside className="w-72 border-r border-gray-50 p-8 flex flex-col gap-4 shrink-0 bg-white">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <span className="font-extrabold text-2xl tracking-tighter text-gray-900 leading-none">Team Talk</span>
                </div>

                <button className="flex items-center gap-4 bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl font-extrabold text-sm transition-all shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Projects
                </button>
            </aside>

            {/* 2. MAIN DASHBOARD CONTENT */}
            <main className="flex-1 p-16 bg-white overflow-y-auto relative">
                
                {/* --- TOP RIGHT PROFILE OVERLAY --- */}
                <div className="absolute top-10 right-16 flex items-center gap-4 z-10">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Logged in as</p>
                        <p className="text-sm font-bold text-gray-800 leading-none">{displayName || "Guest"}</p>
                    </div>
                    <div 
                        className="w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-xl ring-4 ring-gray-50 relative group cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: userColor }} 
                    >
                        {displayName ? displayName.substring(0, 2).toUpperCase() : "YO"}
                        {/* Green Online Dot */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto">
                    
                    {/* Header Text */}
                    <header className="mb-16">
                        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tighter">Projects</h1>
                        <p className="text-gray-400 text-lg mt-3 font-medium">Manage and organize your team's creative assets.</p>
                    </header>

                    {/* --- SECTION 1: MY DESIGNS --- */}
                    <section className="mb-24">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-xl">📂</div>
                                <h2 className="text-2xl font-extrabold text-gray-800">My Designs</h2>
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                                    {myDesigns.length + 1}
                                </span>
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Rooms you created</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {/* NEW DESIGN ACTION CARD */}
                            <div 
                                onClick={() => { setIsCreateModalOpen(true); setStep(1); }} 
                                className="group border-2 border-dashed border-indigo-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center bg-white hover:bg-indigo-50/20 hover:border-indigo-300 cursor-pointer transition-all min-h-[350px] shadow-sm"
                            >
                                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500 text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner">+</div>
                                <h3 className="font-extrabold text-xl text-gray-800 tracking-tight">New Design</h3>
                                <p className="text-sm text-gray-400 mt-3 text-center leading-relaxed font-medium">Create a room with a<br/>custom code</p>
                            </div>

                            {/* USER-OWNED ROOMS */}
                            {myDesigns.map((room) => (
                                <RoomCard key={room.id} room={room} onClick={() => onJoinRoom(room)} />
                            ))}
                        </div>
                    </section>

                    {/* --- SECTION 2: JOINED ROOMS --- */}
                    <section>
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-xl">👥</div>
                                <h2 className="text-2xl font-extrabold text-gray-800">Joined Rooms</h2>
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                                    {joinedRooms.length}
                                </span>
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Collaborative Projects</span>
                        </div>

                        {/* JOIN BANNER ACTION */}
                        <div 
                            onClick={() => { setIsJoinModalOpen(true); setRoomCode(""); }} 
                            className="w-full bg-brand-500 p-10 rounded-[2.5rem] flex items-center justify-between cursor-pointer text-white shadow-2xl shadow-indigo-500/30 mb-12 group hover:bg-brand-600 transition-all overflow-hidden relative"
                        >
                            <div className="absolute right-[-10%] top-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                            
                            <div className="flex items-center gap-8 relative z-10">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl shadow-lg font-bold">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-2xl tracking-tight">Enter a Room Code</h3>
                                    <p className="opacity-80 text-lg mt-1 font-medium tracking-tight">Collaborate on a teammate's design.</p>
                                </div>
                            </div>
                            <div className="mr-6 group-hover:translate-x-3 transition-transform relative z-10 text-3xl">➔</div>
                        </div>

                        {/* COLLABORATOR ROOMS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {joinedRooms.map((room) => (
                                <RoomCard key={room.id} room={room} onClick={() => onJoinRoom(room)} />
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;