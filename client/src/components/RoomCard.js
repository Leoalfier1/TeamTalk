import React from 'react';

// This is a reusable "Card" for each project
const RoomCard = ({ room, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative h-48 bg-gray-200">
        <img 
          src={`https://picsum.photos/seed/${room.roomCode}/400/250`} 
          className="h-full w-full object-cover" 
          alt={room.title} 
        />
        <div className="absolute top-4 left-4">
          <span className="text-[10px] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full font-bold tracking-wider shadow-sm uppercase">
            🏢 {room.roomCode}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <h3 className="font-bold text-xl text-gray-800 mb-4">{room.title}</h3>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-white">
                    {room.ownerName?.substring(0, 2).toUpperCase() || 'JD'}
                </div>
                <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Owner</p>
                    <p className="text-xs font-semibold">{room.ownerName}</p>
                </div>
            </div>
            {/* The little share icon from your design */}
            <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;