import { X } from 'lucide-react';

export default function VideoModal({ videoUrl, onClose }) {
  if (!videoUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white p-4 rounded-lg shadow-2xl relative w-full max-w-3xl"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking on the modal content
      >
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 z-10 hover:bg-gray-200"
        >
          <X size={24} />
        </button>
        <div className="aspect-video">
          <iframe
            className="w-full h-full"
            src={videoUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
}

