import React from 'react';

const CreateModal = ({ 
  step, 
  setStep, 
  isOpen, 
  onClose, 
  roomTitle,      // New Prop
  setRoomTitle,   // New Prop
  displayName, 
  setDisplayName, 
  avatarColor, 
  setAvatarColor, 
  roomCode, 
  setRoomCode, 
  handleCreate 
}) => {
  if (!isOpen) return null;

  const colors = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6">
      <div className="bg-white w-full max-w-lg rounded-4xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500 text-2xl">+</div>
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900">New Design Room</h2>
                    <p className="text-xs text-gray-400 font-medium">Set up your identity and choose a custom code.</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>

        {/* Step Indicator */}
        <div className="px-8 mb-8 flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
                <span className={`text-[11px] font-bold ${step === 1 ? 'text-brand-500' : 'text-gray-400'}`}>Identity</span>
            </div>
            <div className="h-[1px] w-12 bg-gray-100"></div>
            <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
                <span className={`text-[11px] font-bold ${step === 2 ? 'text-brand-500' : 'text-gray-400'}`}>Room Code</span>
            </div>
            <div className="h-[1px] w-12 bg-gray-100"></div>
            <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 3 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>3</div>
                <span className={`text-[11px] font-bold ${step === 3 ? 'text-brand-500' : 'text-gray-400'}`}>Ready</span>
            </div>
        </div>

        <div className="px-10 pb-10">
            {/* STEP 1: IDENTITY (Updated with Project Name) */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* NEW FIELD: PROJECT NAME */}
                    <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">📁 Project Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-100 transition" 
                            placeholder="e.g. Website Design 2024" 
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">👤 Your Display Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-100 transition" 
                            placeholder="e.g. Alex Rivera" 
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
                    <button onClick={() => setStep(2)} className="w-full bg-brand-500 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition">Continue →</button>
                </div>
            )}

            {/* STEP 2: ROOM CODE */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">🔑 Create Room Code</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-6 text-2xl font-black text-center tracking-[0.5em] outline-none uppercase" 
                            placeholder="MY-COOL-ROOM" 
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                        />
                        <p className="text-[10px] text-gray-400 mt-4 text-center font-medium">Teammates will enter this code to join (Max 15 chars).</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="flex-1 py-5 bg-gray-50 text-gray-500 font-extrabold rounded-2xl">Back</button>
                        <button onClick={handleCreate} className="flex-[2] bg-brand-500 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-brand-500/20">Create Room 🚀</button>
                    </div>
                </div>
            )}

            {/* STEP 3: READY */}
            {step === 3 && (
                <div className="text-center py-4 animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
                    <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Room Code Active!</h3>
                    <p className="text-sm text-gray-400 font-medium mb-8">Teammates can now join via your custom code.</p>
                    
                    <div className="bg-brand-50 p-6 rounded-3xl mb-8">
                        <p className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest mb-2">Your Shared Code</p>
                        <p className="text-4xl font-black text-brand-600 tracking-widest">{roomCode || "1234"}</p>
                    </div>

                    <button onClick={onClose} className="w-full bg-brand-500 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition">Open Workspace</button>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">🔒 Private, encrypted connection by default</p>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;