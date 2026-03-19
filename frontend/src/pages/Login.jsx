import { useState } from 'react'
import { ethers } from 'ethers'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:4000/api'

export default function Login() {
    const [status, setStatus] = useState('idle') // idle | connecting | done | error
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const connect = async () => {
        setError('')
        if (!window.ethereum) {
            setError('MetaMask is not installed. Please install it to continue.')
            return
        }
        setStatus('connecting')
        try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const accounts = await provider.send('eth_requestAccounts', [])
            const account = accounts[0].toLowerCase()

            // Check if this wallet is the contract owner (deployer)
            let isOwner = false
            try {
                const res = await fetch(`${API}/owner`)
                const data = await res.json()
                isOwner = data.owner?.toLowerCase() === account
            } catch (_) { /* backend unreachable — still allow login */ }

            localStorage.setItem('account', account)
            localStorage.setItem('isOwner', String(isOwner))
            setStatus('done')
            // Admin → /admin, regular users → /home
            setTimeout(() => navigate(isOwner ? '/admin' : '/home'), 600)
        } catch (err) {
            setStatus('error')
            setError(err.code === 4001 ? 'Connection rejected.' : err.message)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' }}>

            {/* Decorative blobs */}
            <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.13),transparent 70%)', top: '-25%', left: '0%', filter: 'blur(70px)' }} />
                <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.10),transparent 70%)', bottom: '-15%', right: '-5%', filter: 'blur(60px)' }} />
                {['10%,20%', '85%,15%', '70%,80%', '20%,75%'].map((pos, i) => {
                    const [left, top] = pos.split(',')
                    return <div key={i} style={{ position: 'absolute', left, top, width: 40 + i * 15, height: 40 + i * 15, border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, transform: `rotate(${i * 22}deg)`, animation: `floatY ${3 + i * 0.7}s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }} />
                })}
            </div>

            {/* Card */}
            <div className="glass fade-up" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, padding: '3rem 2.6rem', textAlign: 'center' }}>

                {/* Logo */}
                <div style={{ marginBottom: '2.2rem' }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 1.3rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.1rem', boxShadow: '0 0 42px rgba(99,102,241,0.5)' }}>⬡</div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }}>FedShield</h1>
                    <p style={{ fontSize: '0.88rem', margin: 0 }}>Federated Learning Blockchain Registry</p>
                </div>

                <div className="divider" />

                {/* Role info */}
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.8rem' }}>
                    {[
                        { icon: '👑', label: 'Admin', desc: 'Contract owner — full control', color: '#f59e0b' },
                        { icon: '👤', label: 'User', desc: 'Any wallet — view & monitor', color: '#6366f1' },
                    ].map(({ icon, label, desc, color }) => (
                        <div key={label} style={{ flex: 1, padding: '0.9rem', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{label}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{desc}</div>
                        </div>
                    ))}
                </div>

                {/* Feature list */}
                <div className="stagger" style={{ textAlign: 'left', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[
                        ['☁️', 'IPFS via Pinata', 'Model files pinned permanently'],
                        ['🔗', 'On-chain Registry', 'CIDs stored on Polygon Amoy'],
                        ['🔒', 'Role Detection', 'Owner auto-identified from contract'],
                    ].map(([icon, title, sub]) => (
                        <div key={title} className="fade-up" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.75rem 0.9rem', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '1.2rem', lineHeight: 1.2, flexShrink: 0 }}>{icon}</span>
                            <div><div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: 2 }}>{title}</div><div style={{ fontSize: '0.73rem', color: 'var(--text-2)' }}>{sub}</div></div>
                        </div>
                    ))}
                </div>

                {error && <div className="alert-error fade-in" style={{ marginBottom: '1.2rem', textAlign: 'left' }}>⚠️ {error}</div>}

                <button
                    id="connect-wallet-btn"
                    className="btn btn-primary"
                    onClick={connect}
                    disabled={status === 'connecting' || status === 'done'}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.95rem', fontSize: '1rem' }}
                >
                    {status === 'connecting' ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Connecting…</>
                        : status === 'done' ? <>✅ Connected! Redirecting…</>
                            : <><span style={{ fontSize: '1.1rem' }}>🦊</span> Connect with MetaMask</>}
                </button>

                <p style={{ marginTop: '1.2rem', fontSize: '0.73rem', color: 'var(--text-3)' }}>
                    Your role is determined automatically by your wallet address
                </p>

                <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div className="pulse-dot" />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Polygon Amoy Testnet</span>
                </div>
            </div>
        </div>
    )
}