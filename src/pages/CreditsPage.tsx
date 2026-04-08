import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, ArrowRight, ChevronLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../components/FirebaseProvider';

export const CreditsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useFirebase();
  const [selectedOption, setSelectedOption] = useState<{ credits: number; price: number } | null>(null);

  const options = [
    { credits: 5, price: 5, description: 'Perfect for a quick refinement' },
    { credits: 10, price: 10, description: 'Best for a new collection', popular: true },
    { credits: 25, price: 20, description: 'Professional design volume', savings: '20% Off' },
  ];

  const handlePurchase = () => {
    if (!selectedOption) return;
    navigate('/checkout', { 
      state: { 
        type: 'credits', 
        credits: selectedOption.credits, 
        amount: selectedOption.price 
      } 
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-12"
    >
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-black/40 hover:text-[#EFBB76] transition-colors group mb-12"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="text-center mb-16">
        <div className="w-20 h-20 bg-[#EFBB76]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-[#EFBB76]" />
        </div>
        <h1 className="text-5xl font-serif font-bold text-black mb-4">Get More Credits</h1>
        <p className="text-black/40 text-lg max-w-md mx-auto">
          Fuel your creativity. Purchase additional design credits to continue crafting your masterpiece.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {options.map((option) => (
          <button
            key={option.credits}
            onClick={() => setSelectedOption(option)}
            className={`relative p-8 rounded-[2.5rem] border-2 transition-all text-left flex flex-col h-full ${
              selectedOption?.credits === option.credits 
                ? 'border-[#EFBB76] bg-[#EFBB76]/5 shadow-xl scale-105' 
                : 'border-black/5 bg-white hover:border-black/10 hover:shadow-md'
            }`}
          >
            {option.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                Most Popular
              </span>
            )}
            {option.savings && (
              <span className="absolute top-6 right-6 px-2 py-1 bg-green-100 text-green-600 text-[8px] font-black uppercase tracking-widest rounded-lg">
                {option.savings}
              </span>
            )}
            
            <div className="mb-8">
              <h3 className="text-3xl font-serif font-bold text-black mb-1">{option.credits}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Design Credits</p>
            </div>

            <p className="text-xs text-black/60 mb-8 flex-grow">{option.description}</p>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-black">${option.price}</span>
              <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest">USD</span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-black/5 p-8 rounded-[3rem] border border-black/10 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6 text-[#EFBB76]" />
            </div>
            <div>
              <p className="text-sm font-bold text-black">Secure Checkout</p>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Powered by Shopify</p>
            </div>
          </div>
          
          <button
            disabled={!selectedOption}
            onClick={handlePurchase}
            className="btn-primary px-12 py-5 text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            Pay Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="pt-8 border-t border-black/5 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#EFBB76] shrink-0" />
            <p className="text-xs text-black/60 leading-relaxed">Credits are added instantly to your account after successful payment.</p>
          </div>
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#EFBB76] shrink-0" />
            <p className="text-xs text-black/60 leading-relaxed">No expiration. Use your purchased credits whenever you're ready to design.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
