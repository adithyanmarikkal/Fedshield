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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div className="glass fade-up" style={{ width: '100%', maxWidth: 420, padding: '2.5rem 2rem' }}>

                {/* Logo */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 12,
                        margin: '0 auto 1rem',
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '1.45rem', marginBottom: 4 }}>FedShield</h1>
                    <p style={{ fontSize: '0.84rem', margin: 0 }}>Federated Learning Blockchain Registry</p>
                </div>

                <div className="divider" />

                {/* Role info */}
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Admin', desc: 'Contract owner — full control', color: '#f59e0b' },
                        { label: 'Participant', desc: 'Any wallet — view & monitor', color: 'var(--accent-2)' },
                    ].map(({ label, desc, color }) => (
                        <div key={label} style={{ flex: 1, padding: '0.875rem', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color, marginBottom: 3 }}>{label}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{desc}</div>
                        </div>
                    ))}
                </div>

                {/* Feature list */}
                <div style={{ marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {[
                        ['IPFS via Pinata', 'Model files pinned permanently'],
                        ['On-chain Registry', 'CIDs stored on Polygon Amoy'],
                        ['Role Detection', 'Owner auto-identified from contract'],
                    ].map(([title, sub]) => (
                        <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.875rem', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-2)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 1 }}>{title}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {error && <div className="alert-error fade-in" style={{ marginBottom: '1rem' }}>{error}</div>}

                <button
                    id="connect-wallet-btn"
                    className="btn btn-primary"
                    onClick={connect}
                    disabled={status === 'connecting' || status === 'done'}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                >
                    {status === 'connecting'
                        ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Connecting…</>
                        : status === 'done'
                            ? 'Connected — Redirecting…'
                            : 'Connect with MetaMask'}
                </button>

                <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <div className="pulse-dot" />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Polygon Amoy Testnet</span>
                </div>

                <p style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    Your role is determined automatically by your wallet address
                </p>
            </div>
        </div>
    )
}