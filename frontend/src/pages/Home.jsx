import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:4000/api'
const short = (s = '') => s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s
const ago = (ts) => {
    const d = Math.floor((Date.now() - ts * 1000) / 1000)
    if (d < 60) return `${d}s ago`
    if (d < 3600) return `${Math.floor(d / 60)}m ago`
    return new Date(ts * 1000).toLocaleDateString()
}

function Navbar({ account, isOwner, onLogout, navigate }) {
    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 50,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            background: 'rgba(6,10,18,0.80)',
            borderBottom: '1px solid var(--border)',
        }}>
            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 1.5rem', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ⬡ FedShield
                    </span>
                    <div style={{ display: 'flex', gap: 3 }}>
                        <button className="btn btn-primary" style={{ padding: '0.38rem 0.9rem', fontSize: '0.8rem' }}>Home</button>
                        <button className="btn btn-ghost" onClick={() => navigate('/blockchain')} style={{ padding: '0.38rem 0.9rem', fontSize: '0.8rem' }}>Blockchain</button>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    {isOwner && <span className="badge badge-accent">👑 Owner</span>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem 0.75rem' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-2)' }}>{short(account)}</span>
                    </div>
                    <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '0.38rem 0.85rem', fontSize: '0.78rem' }}>Disconnect</button>
                </div>
            </div>
        </nav>
    )
}

function StatCard({ icon, label, value, sub, color = '#6366f1', delay = 0, onClick }) {
    return (
        <div className="glass glass-hover fade-up" onClick={onClick}
            style={{ padding: '1.4rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', cursor: onClick ? 'pointer' : 'default', animationDelay: `${delay}s` }}>
            <div style={{
                width: 48, height: 48, borderRadius: 13, flexShrink: 0,
                background: `${color}1a`, border: `1px solid ${color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', boxShadow: `0 0 18px ${color}22`,
            }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-3)', marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-1)' }}>{value}</div>
                {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginTop: 4, wordBreak: 'break-all', fontFamily: 'monospace' }}>{sub}</div>}
            </div>
        </div>
    )
}

export default function Home() {
    const navigate = useNavigate()
    const account = localStorage.getItem('account') || ''
    const isOwner = localStorage.getItem('isOwner') === 'true'
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        try {
            const [rnd, mdl, vers] = await Promise.all([
                fetch(`${API}/current-round`).then(r => r.json()),
                fetch(`${API}/latest-model`).then(r => r.json()),
                fetch(`${API}/model-versions`).then(r => r.json()),
            ])
            setData({
                round: rnd.currentRound,
                latestCid: mdl.cid,
                latestGateway: mdl.gateway,
                totalVersions: (vers.versions || []).length,
                recentVersions: (vers.versions || []).slice(-3).reverse(),
            })
        } catch (_) { }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchStats() }, [fetchStats])

    const logout = () => { localStorage.clear(); navigate('/login') }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            <Navbar account={account} isOwner={isOwner} onLogout={logout} navigate={navigate} />

            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '3rem 1.5rem' }}>

                {/* Hero */}
                <div className="fade-up" style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.7rem' }}>
                        <div className="pulse-dot" />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 500 }}>Connected · Polygon Amoy Testnet</span>
                    </div>
                    <h1 style={{ marginBottom: '0.7rem' }}>
                        Welcome,{' '}
                        <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {short(account)}
                        </span>
                    </h1>
                    <p style={{ maxWidth: 560, fontSize: '0.96rem' }}>
                        Monitor your federated learning network and manage on-chain global model registrations.
                    </p>
                </div>

                {/* Stat cards */}
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)' }}>Network Overview</h2>
                    <button className="btn btn-ghost" onClick={fetchStats} style={{ padding: '0.38rem 0.85rem', fontSize: '0.76rem' }}>↻ Refresh</button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
                ) : data ? (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <StatCard icon="🔄" label="Current Round" value={data.round} color="#6366f1" delay={0} />
                            <StatCard icon="📦" label="Model Versions" value={data.totalVersions} color="#8b5cf6" delay={0.07} onClick={() => navigate('/blockchain')} />
                            <StatCard icon="🔒" label="Latest Global CID" value={short(data.latestCid)} sub={data.latestCid} color="#22c55e" delay={0.14} />
                        </div>

                        {/* Recent models */}
                        {data.recentVersions?.length > 0 && (
                            <div className="glass fade-up" style={{ marginBottom: '1.5rem', overflow: 'hidden', animationDelay: '0.2s' }}>
                                <div style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <h3 style={{ fontSize: '0.92rem' }}>📋 Recent Global Models</h3>
                                    <button className="btn btn-ghost" onClick={() => navigate('/blockchain')} style={{ padding: '0.33rem 0.75rem', fontSize: '0.73rem' }}>View all →</button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table>
                                        <thead>
                                            <tr><th>Version</th><th>Round</th><th>IPFS CID</th><th>Recorded</th></tr>
                                        </thead>
                                        <tbody>
                                            {data.recentVersions.map((v, i) => (
                                                <tr key={i}>
                                                    <td><span className="badge badge-accent">v{v.version}</span></td>
                                                    <td style={{ color: 'var(--text-2)' }}>{v.round}</td>
                                                    <td><a href={v.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>{short(v.ipfsCID)}</a></td>
                                                    <td style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{ago(v.timestamp)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="glass fade-up" style={{
                            padding: '1.8rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.2rem',
                            background: 'linear-gradient(135deg,rgba(99,102,241,0.10),rgba(139,92,246,0.07))',
                            borderColor: 'rgba(99,102,241,0.28)', animationDelay: '0.25s',
                        }}>
                            <div>
                                <h3 style={{ marginBottom: 5 }}>Upload a trained model</h3>
                                <p style={{ margin: 0, fontSize: '0.86rem' }}>Pin your updated <code>.json</code> file to IPFS and register it on-chain in one click.</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => navigate('/blockchain')} style={{ minWidth: 210, justifyContent: 'center' }}>
                                🔗 Open Blockchain Dashboard →
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="glass fade-up" style={{ padding: '3rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>⚠️ Could not reach blockchain server on port 4000.</p>
                        <button className="btn btn-primary" onClick={fetchStats}>Retry</button>
                    </div>
                )}
            </div>
        </div>
    )
}
