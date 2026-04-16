import React from 'react';

const JoinModal = ({ isOpen, onClose, roomCode, setRoomCode, displayName, setDisplayName, avatarColor, setAvatarColor, handleJoin }) => {
  if (!isOpen) return null;

  const colors = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6">
      <div className="bg-white w-full max-w-lg rounded-4xl shadow-2xl overflow-hidden">
        <div className="p-8 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500 text-2xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900">Join a Room</h2>
                    <p className="text-xs text-gray-400 font-medium">Enter the Room Code shared by your teammate.</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div className="p-10 space-y-8">
            <div>
                <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">🏢 Room Code</label>
                <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-lg font-black tracking-widest outline-none uppercase placeholder:font-medium placeholder:tracking-normal" 
                    placeholder="TT-XXXX" 
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-3 font-medium">Format: TT-XXXX (from the room owner)</p>
            </div>

            <div>
                <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">👤 Your Display Name</label>
                <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none" 
                    placeholder="e.g. Jordan Lee" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
            </div>

            <div>
                <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">🎨 Avatar Color</label>
                <div className="flex items-center gap-3">
                    {colors.map(c => (
                        <button 
                            key={c} 
                            onClick={() => setAvatarColor(c)}
                            className={`w-10 h-10 rounded-full transition-all ${avatarColor === c ? 'ring-4 ring-brand-100 scale-110' : ''}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <button onClick={handleJoin} className="w-full bg-brand-500 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition">Join Room</button>
        </div>
      </div>
    </div>
  );
};

export default JoinModal;