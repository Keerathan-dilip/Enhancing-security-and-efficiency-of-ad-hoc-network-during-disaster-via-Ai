import React from 'react';
import { DeliveredPacketInfo } from '../types';

interface PacketDeliveryLogProps {
  packets: DeliveredPacketInfo[];
  onClear: () => void;
}

const PacketDeliveryLog: React.FC<PacketDeliveryLogProps> = ({ packets, onClear }) => {
  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-cyan-300">AI Packet Delivery Log</h3>
        <button
          onClick={onClear}
          className="px-2 py-1 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
          title="Clear log"
        >
          Clear
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
        {packets.slice().reverse().map(packet => {
          const isDelivered = packet.status === 'delivered';
          const durationInSeconds = (packet.transmissionTime / 1000).toFixed(1);
          return (
          <div key={packet.id} className={`bg-gray-700/50 p-2.5 rounded-md text-sm border-l-2 ${isDelivered ? 'border-green-400' : 'border-red-400'}`}>
            <div className="flex items-start space-x-2">
                {isDelivered ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                )}
               
                <div className="flex-grow">
                     <p className={`font-bold text-xs ${isDelivered ? 'text-green-300' : 'text-red-300'}`}>
                        AI Packet {isDelivered ? 'Delivered' : 'Dropped'} ({durationInSeconds}s)
                     </p>
                    <p className="text-xs text-gray-400 leading-tight"><span className="font-semibold text-cyan-400">From:</span> {packet.from}</p>
                    <p className="text-xs text-gray-400 leading-tight"><span className="font-semibold text-cyan-400">To:</span> {packet.to}</p>
                    <p className="text-xs text-gray-400 leading-tight mt-1">
                        <span className="font-semibold text-cyan-400">Attempted Path:</span> {packet.path.join(' → ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Message:</p>
                    <p className="text-xs text-white whitespace-pre-wrap bg-gray-900/50 p-1.5 rounded font-mono break-words">{packet.message}</p>
                </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};

export default PacketDeliveryLog;