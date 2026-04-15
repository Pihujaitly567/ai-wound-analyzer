import { AlertTriangle, Phone, MapPin } from 'lucide-react';

export default function TelehealthCard() {
  return (
    <div className="glass-card bg-rose-50/90 border-2 border-rose-200 p-6 md:p-8 rounded-2xl shadow-lg relative overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-rose-200/40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
        <div className="bg-rose-100 text-rose-600 p-5 rounded-full shrink-0 flex items-center justify-center shadow-sm">
          <AlertTriangle size={40} className="animate-pulse" />
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-extrabold text-rose-700 mb-2">Priority Medical Attention Recommended</h3>
          <p className="text-rose-600/80 font-medium mb-4">
            The AI has detected visual indicators that suggest a high-risk condition. We strongly advise having this examined by a healthcare professional soon.
          </p>
          <ul className="text-sm text-rose-700 font-medium flex flex-wrap justify-center md:justify-start gap-4">
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Watch for fever</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Do not pop blisters</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Keep wound covered</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-auto shrink-0 mt-4 md:mt-0">
          <a href="https://www.google.com/maps/search/Urgent+care+near+me" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
            <MapPin size={20} /> Find Urgent Care
          </a>
          <a href="tel:911" className="flex items-center justify-center gap-2 bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 px-6 py-3.5 rounded-xl font-bold transition-colors">
            <Phone size={18} /> Call Emergency
          </a>
        </div>
      </div>
    </div>
  );
}
