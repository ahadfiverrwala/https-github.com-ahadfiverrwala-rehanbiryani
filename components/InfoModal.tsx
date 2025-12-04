import React from 'react';
import { X, MapPin, Phone } from 'lucide-react';
import { CampusInfo } from '../types';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const campuses: CampusInfo[] = [
    { name: "Korangi Campus", principal: "Mam Rahat", phone: "+92 314 7092867" },
    { name: "Munawwar Campus", principal: "Miss Rubab", phone: "+92 323 2145559" },
    { name: "Lahore Campus", principal: "Ishan Ahmed Hussaini", phone: "+92 301 5978935" },
    { name: "Islamabad Campus", principal: "Asma", phone: "+92 301 3445767" },
    { name: "Online Academy", principal: "Doulat", phone: "+92 301 6922935" },
    { name: "Orangi Campus", principal: "Miss Hina", phone: "+92 301 2781826" }
];

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white/95 p-5 border-b border-slate-100 flex justify-between items-center z-10 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-slate-800">Rehan School Contacts</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campuses.map((campus, idx) => (
                        <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all">
                            <h3 className="font-bold text-blue-600 flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4" />
                                {campus.name}
                            </h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <p>Principal: <span className="text-slate-900 font-semibold">{campus.principal}</span></p>
                                <p className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-emerald-500" />
                                    {campus.phone}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InfoModal;