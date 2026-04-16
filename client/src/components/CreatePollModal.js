import React from 'react';

const CreatePollModal = ({ isOpen, onClose, question, setQuestion, options, setOptions, handleLaunch }) => {
  if (!isOpen) return null;

  const addOption = () => setOptions([...options, ""]);
  
  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    }
  };

  return (
    // Ensure z-[9999] is used so it stays on top of the workspace sidebar
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-6">
      <div className="bg-white w-full max-w-lg rounded-4xl shadow-2xl overflow-hidden relative">
        {/* Header (Purple as seen in Image 2) */}
        <div className="bg-brand-500 p-8 flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
                <span className="text-2xl">📊</span>
                <h2 className="text-xl font-extrabold tracking-tight">Create New Poll</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl font-bold">×</button>
        </div>

        <div className="p-10 space-y-8">
            {/* Question Field */}
            <div>
                <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">Question <span className="text-red-500">*</span></label>
                <textarea 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-100 transition resize-none" 
                    placeholder="e.g. What background color for the hero section?" 
                    rows="3"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                />
                <p className="text-right text-[10px] text-gray-400 mt-2 font-bold uppercase">{question.length} / 140</p>
            </div>

            {/* Options List */}
            <div>
                <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest block mb-3">Options <span className="text-red-500">*</span></label>
                <div className="space-y-3">
                    {options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3 group">
                            <div className="text-gray-300">⠿</div>
                            <input 
                                type="text" 
                                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm font-medium outline-none focus:border-brand-300" 
                                placeholder={`Option ${idx + 1}`}
                                value={opt}
                                onChange={(e) => updateOption(idx, e.target.value)}
                            />
                            <button onClick={() => removeOption(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={addOption} 
                    className="mt-6 w-full py-4 border-2 border-dashed border-brand-100 text-brand-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-50 transition"
                >
                    + Add option
                </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-4 pt-4">
                <button onClick={onClose} className="flex-1 py-5 bg-gray-50 text-gray-500 font-extrabold rounded-2xl">Cancel</button>
                <button onClick={handleLaunch} className="flex-[2] bg-brand-500 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition flex items-center justify-center gap-2">
                    <span className="text-lg">▶</span> Launch Poll
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePollModal;