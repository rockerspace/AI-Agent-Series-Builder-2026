import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

interface NegotiationStep {
  sender: 'buyer_agent' | 'pachama_agent' | 'gold_standard_agent' | 'cleanair_agent';
  senderLabel: string;
  avatarColor: string;
  text: string;
  round: number;
}

export const Negotiations: React.FC = () => {
  const [biddingActive, setBiddingActive] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [logs, setLogs] = useState<NegotiationStep[]>([]);
  const [offsetTons, setOffsetTons] = useState(5.0);
  const [winner, setWinner] = useState<string | null>(null);

  const startBidding = () => {
    setBiddingActive(true);
    setCurrentRound(1);
    setWinner(null);
    setLogs([
      {
        sender: 'buyer_agent',
        senderLabel: 'EcoPulse Buyer Agent',
        avatarColor: 'var(--primary-cyan)',
        text: `Initiating bidding session for ${offsetTons} metric tons of Gold-Standard/VCS certified carbon offsets. Requesting proposals from active carbon brokers...`,
        round: 1
      }
    ]);
  };

  useEffect(() => {
    if (!biddingActive || currentRound === 0) return;

    let timer: any;

    if (currentRound === 1 && logs.length === 1) {
      timer = setTimeout(() => {
        setLogs(prev => [
          ...prev,
          {
            sender: 'pachama_agent',
            senderLabel: 'Pachama Forestry Agent (US)',
            avatarColor: '#10b981',
            text: `Proposal received. We offer Premium Reforestation Credits (VCS certified) at $14.50 per metric ton. Total cost: $${(offsetTons * 14.5).toFixed(2)}. This project offsets via active forest restoration in Oregon.`,
            round: 1
          },
          {
            sender: 'gold_standard_agent',
            senderLabel: 'Gold Standard Methane Agent (EU)',
            avatarColor: '#3b82f6',
            text: `Proposal received. We offer High-Impact Methane Capture Credits (Gold Standard certified) at $12.00 per metric ton. Total cost: $${(offsetTons * 12.0).toFixed(2)}. Project ID: GS-55829.`,
            round: 1
          },
          {
            sender: 'cleanair_agent',
            senderLabel: 'CleanAir Solar Broker (India)',
            avatarColor: '#eab308',
            text: `Proposal received. We offer Renewable Grid Offset Credits (VCS/CDM certified) at $8.50 per metric ton. Total cost: $${(offsetTons * 8.5).toFixed(2)}. Offsets via solar power grids in Karnataka.`,
            round: 1
          }
        ]);
        setCurrentRound(2);
      }, 2000);
    } else if (currentRound === 2 && logs.length === 4) {
      timer = setTimeout(() => {
        setLogs(prev => [
          ...prev,
          {
            sender: 'buyer_agent',
            senderLabel: 'EcoPulse Buyer Agent',
            avatarColor: 'var(--primary-cyan)',
            text: `Evaluated Round 1 bids. CleanAir offers the lowest price ($8.50/ton) but carries lower ecological co-benefits than Pachama's reforestation model. Pachama, can you discount for bulk registry? Gold Standard, do you offer additional sustainability scoring guarantees?`,
            round: 2
          }
        ]);
      }, 2500);
    } else if (currentRound === 2 && logs.length === 5) {
      timer = setTimeout(() => {
        setLogs(prev => [
          ...prev,
          {
            sender: 'pachama_agent',
            senderLabel: 'Pachama Forestry Agent (US)',
            avatarColor: '#10b981',
            text: `Understood. We can adjust the registry allocation. Best final offer: $13.00/ton ($${(offsetTons * 13.0).toFixed(2)} total) with full wildlife impact audits.`,
            round: 2
          },
          {
            sender: 'gold_standard_agent',
            senderLabel: 'Gold Standard Methane Agent (EU)',
            avatarColor: '#3b82f6',
            text: `Verified. We guarantee 100% permanence and carry a Gold Standard triple-bottom-line social impact rating. Final offer: $11.00/ton ($${(offsetTons * 11.0).toFixed(2)} total).`,
            round: 2
          },
          {
            sender: 'cleanair_agent',
            senderLabel: 'CleanAir Solar Broker (India)',
            avatarColor: '#eab308',
            text: `We will maintain our highly competitive baseline. Final offer: $8.00/ton ($${(offsetTons * 8.0).toFixed(2)} total).`,
            round: 2
          }
        ]);
        setCurrentRound(3);
      }, 2000);
    } else if (currentRound === 3 && logs.length === 8) {
      timer = setTimeout(() => {
        const selected = 'Pachama Forestry Agent (US)';
        const price = 13.00;
        setWinner(selected);
        setLogs(prev => [
          ...prev,
          {
            sender: 'buyer_agent',
            senderLabel: 'EcoPulse Buyer Agent',
            avatarColor: 'var(--primary-cyan)',
            text: `Negotiation completed. Based on high permanence rating, VCS Reforestation audits, and the discounted $13.00/ton rate, I am awarding the transaction to Pachama Forestry Agent! Total Transaction size: $${(offsetTons * price).toFixed(2)}. Initiating VCS registry settlement...`,
            round: 3
          }
        ]);
        setBiddingActive(false);
      }, 3000);
    }

    return () => clearTimeout(timer);
  }, [biddingActive, currentRound, logs, offsetTons]);

  return (
    <div className="dashboard-scroll" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <RefreshCw size={18} color="var(--primary-cyan)" className={biddingActive ? 'spin-logo' : ''} /> 
          Agent-to-Agent Bidding & Negotiation Room
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
          Simulate autonomous offset brokerage! Your personal EcoPulse buyer agent negotiates live pricing, certificates, and permanence metrics directly with registered carbon registries to secure the most optimized deal.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tons to Offset</label>
            <input 
              type="number" 
              value={offsetTons} 
              onChange={(e) => setOffsetTons(Math.max(1, Number(e.target.value)))}
              disabled={biddingActive}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-glass)',
                padding: '8px 12px',
                borderRadius: '8px',
                color: '#fff',
                width: '100px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={startBidding}
            disabled={biddingActive}
            style={{
              alignSelf: 'flex-end',
              background: biddingActive ? 'rgba(255,255,255,0.05)' : 'var(--primary-cyan)',
              color: biddingActive ? 'var(--text-dim)' : '#070a13',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: biddingActive ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {biddingActive ? 'Bids streaming...' : 'Start Agent Negotiation'} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {logs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'flex-start',
                background: log.sender === 'buyer_agent' ? 'rgba(0, 240, 255, 0.03)' : 'rgba(255,255,255,0.01)',
                padding: '16px',
                borderRadius: '12px',
                border: log.sender === 'buyer_agent' ? '1px solid rgba(0, 240, 255, 0.15)' : '1px solid var(--border-glass)'
              }}
            >
              <div style={{ 
                background: log.avatarColor, 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#070a13',
                fontSize: '11px',
                fontWeight: 800,
                flexShrink: 0
              }}>
                {log.senderLabel.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>{log.senderLabel}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Round {log.round}</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {log.text}
                </p>
              </div>
            </div>
          ))}

          {winner && (
            <div className="offset-box" style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.05) 100%)', 
              border: '1px solid rgba(16, 185, 129, 0.35)', 
              padding: '20px', 
              borderRadius: '16px', 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'center',
              marginTop: '10px'
            }}>
              <div className="offset-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '50%', color: '#10b981' }}>
                <ShieldCheck size={28} />
              </div>
              <div className="offset-text">
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', margin: 0 }}>
                  Awarded Contract: {winner}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  Negotiations complete. Purchased certified reforestation carbon offset ledger matching {offsetTons} metric tons at $13.00/ton.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default Negotiations;
