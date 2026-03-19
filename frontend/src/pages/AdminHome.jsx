import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:4000/api'
const short = (s = '') => s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s
const ago = (ts) => {
    const d = Math.floor((Date.now() - ts * 1000) / 1000)
    if (d < 60) return `${d}s ago`; if (d < 3600) return `${Math.floor(d / 60)}m ago`
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`; return new Date(ts * 1000).toLocaleDateString()
}

function Navbar({ tab, setTab, account, onLogout }) {
    const tabs = ['Node Management', 'Verify Client Updates', 'Aggregation']
    return (
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(22px) saturate(190%)', WebkitBackdropFilter: 'blur(22px) saturate(190%)', background: 'rgba(6,10,18,0.85)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 1.5rem', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 900, background: 'linear-gradient(135deg,#f43f5e,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⬡ FedShield Admin</span>
                    <div className="tab-bar">
                        {tabs.map(t => <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={tab === t ? { background: 'rgba(244,63,94,0.15)', color: '#f43f5e' } : {}}>{t}</button>)}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span className="badge badge-accent" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)' }}>👑 Admin</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem 0.75rem' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                        <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--text-2)' }}>{short(account)}</span>
                    </div>
                    <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '0.38rem 0.85rem', fontSize: '0.76rem' }}>Disconnect</button>
                </div>
            </div>
        </nav>
    )
}

function NodeManagementTab() {
    const [address, setAddress] = useState('')
    const [action, setAction] = useState('authorize') // 'authorize' or 'revoke'
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    // Node list state
    const [nodes, setNodes] = useState([])
    const [nodesLoading, setNodesLoading] = useState(true)

    const fetchNodes = useCallback(async () => {
        setNodesLoading(true)
        try {
            const res = await fetch(`${API}/authorized-nodes`)
            const data = await res.json()
            setNodes(data.nodes || [])
        } catch (_) { setNodes([]) } finally { setNodesLoading(false) }
    }, [])

    useEffect(() => { fetchNodes() }, [fetchNodes])

    const submit = async () => {
        if (!address) return setError('Address required')
        if (address.length !== 42 || !address.startsWith('0x')) return setError('Invalid Ethereum address format.')
        setError(''); setResult(null); setLoading(true)

        try {
            const endpoint = action === 'authorize' ? '/authorize-node' : '/revoke-node'
            const res = await fetch(`${API}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Request failed')
            setResult({ ...data, actionType: action })
            setAddress('')
            // Refresh node list after successful action
            fetchNodes()
        } catch (e) {
            setError(e.message)
        } finally { setLoading(false) }
    }

    return (
        <div className="fade-up">
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ marginBottom: '0.6rem' }}>Client Node Management</h1>
                <p style={{ maxWidth: 540, fontSize: '0.94rem' }}>
                    Only authorised addresses can record client updates on the blockchain. Add or remove nodes carefully.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div className="glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <button className={`btn ${action === 'authorize' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAction('authorize')} style={action === 'authorize' ? { background: '#10b981', color: 'white', borderColor: '#10b981' } : { flex: 1 }}>Authorize Node +</button>
                        <button className={`btn ${action === 'revoke' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAction('revoke')} style={action === 'revoke' ? { background: '#f43f5e', color: 'white', borderColor: '#f43f5e' } : { flex: 1 }}>Revoke Node ✕</button>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)', marginBottom: '0.5rem' }}>Node Ethereum Address</label>
                        <input type="text" placeholder="0x..." value={address} onChange={e => { setAddress(e.target.value); setError('') }} style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-1)', outline: 'none', fontFamily: 'monospace' }} />
                    </div>

                    {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</div>}

                    <button className="btn btn-primary" onClick={submit} disabled={loading || !address} style={{ width: '100%', justifyContent: 'center', background: action === 'authorize' ? '#10b981' : '#f43f5e', borderColor: action === 'authorize' ? '#10b981' : '#f43f5e', color: 'white' }}>
                        {loading ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Processing Tx…</> : <>{action === 'authorize' ? 'Submit Authorization Tx' : 'Submit Revocation Tx'}</>}
                    </button>
                </div>

                <div>
                    {result && (
                        <div className="glass fade-up" style={{ padding: '1.6rem', borderColor: result.actionType === 'authorize' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
                                <span style={{ fontSize: '1.6rem' }}>✅</span>
                                <div><h3 style={{ color: result.actionType === 'authorize' ? '#10b981' : '#f43f5e', marginBottom: 2 }}>{result.actionType === 'authorize' ? 'Node Authorized' : 'Node Revoked'}</h3><span style={{ fontSize: '0.73rem', color: 'var(--text-2)' }}>Tx Confirmed via Polygon Amoy</span></div>
                            </div>
                            {[['Target Address', short(result.address), null], ['Transaction', result.txHash, result.explorer], ['Block', `#${result.blockNumber}`, null]].map(([label, val, link]) => (
                                <div key={label} style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.76rem', wordBreak: 'break-all' }}>{val}</a>
                                        : <span style={{ fontFamily: 'monospace', fontSize: '0.76rem', wordBreak: 'break-all' }}>{val}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Authorized Nodes List */}
            <div className="glass fade-up" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '0.9rem', margin: 0 }}>
                        Registered Nodes <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem', marginLeft: 8 }}>{nodes.length}</span>
                    </h3>
                    <button className="btn btn-ghost" onClick={fetchNodes} style={{ padding: '0.35rem 0.7rem', fontSize: '0.74rem' }}>↻ Refresh</button>
                </div>
                {nodesLoading ? (
                    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: 22, height: 22 }} /></div>
                ) : nodes.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead><tr><th>Status</th><th>Node Address</th><th>Last Tx</th></tr></thead>
                            <tbody>
                                {nodes.map((n, i) => (
                                    <tr key={i}>
                                        <td>
                                            {n.authorized
                                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.74rem', fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Active</span>
                                                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(244,63,94,0.12)', color: '#f43f5e', fontSize: '0.74rem', fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e' }} /> Revoked</span>
                                            }
                                        </td>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-1)' }}>{n.address}</span></td>
                                        <td><a href={n.explorer} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>{short(n.lastTxHash)}</a></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>🔒</div>
                        <p>No nodes have been registered yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function VerifyClientUpdatesTab() {
    const [allUpdates, setAllUpdates] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchAllUpdates = useCallback(async () => {
        setLoading(true)
        try {
            const rndRes = await fetch(`${API}/current-round`).then(r => r.json())
            const cr = rndRes.currentRound ?? 0
            // Fetch updates for every round (0 through currentRound)
            const promises = []
            for (let r = 0; r <= cr; r++) {
                promises.push(
                    fetch(`${API}/client-updates/${r}`)
                        .then(res => res.json())
                        .then(data => (data.updates || []).map(u => ({ ...u, round: r })))
                        .catch(() => [])
                )
            }
            const results = await Promise.all(promises)
            // Flatten and sort by timestamp descending (newest first)
            const flat = results.flat().sort((a, b) => b.timestamp - a.timestamp)
            setAllUpdates(flat)
        } catch (_) { setAllUpdates([]) } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchAllUpdates() }, [fetchAllUpdates])

    return (
        <div className="fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.6rem' }}>Verify Local Updates</h1>
                    <p style={{ maxWidth: 540, fontSize: '0.94rem', margin: 0 }}>Review all local model submissions from participating nodes across all rounds.</p>
                </div>
                <button className="btn btn-ghost" onClick={fetchAllUpdates} style={{ padding: '0.4rem 0.8rem', fontSize: '0.76rem' }}>↻ Refresh</button>
            </div>

            <div className="glass" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    <h3 style={{ fontSize: '0.9rem', margin: 0 }}>All Client Submissions <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem', marginLeft: 8 }}>{allUpdates.length}</span></h3>
                </div>
                {loading ? (
                    <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: 25, height: 25 }} /></div>
                ) : allUpdates.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead><tr><th>Round</th><th>Node Address</th><th>IPFS Hash (Local Weights)</th><th>Metadata</th><th>Submitted</th></tr></thead>
                            <tbody>
                                {allUpdates.map((u, i) => (
                                    <tr key={i}>
                                        <td><span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>Round {u.round}</span></td>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-1)' }}>{u.nodeAddress}</span></td>
                                        <td><a href={u.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{u.ipfsCID}</a></td>
                                        <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)' }}>{u.metadata || 'None'}</span></td>
                                        <td style={{ color: 'var(--text-2)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{ago(u.timestamp)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>📭</div>
                        <p>No client updates have been submitted yet.</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>Client nodes need to use the User Home → Upload Local Model flow to submit updates.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function AggregationTab() {
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState(false)

    const handleAggregate = () => {
        setRunning(true)
        // Simulate an aggregation task running via a python subprocess
        setTimeout(() => {
            setRunning(false)
            setResult(true)
        }, 2500)
    }

    return (
        <div className="fade-up">
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ marginBottom: '0.6rem' }}>Global Model Aggregation</h1>
                <p style={{ maxWidth: 540, fontSize: '0.94rem' }}>
                    Trigger the Python FedAvg algorithm to aggregate local IPFS weights, create a new global model, and advance the blockchain round.
                </p>
            </div>

            <div className="glass" style={{ padding: '3rem', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(244,63,94,0.2),rgba(236,72,153,0.1))', border: '1px solid rgba(244,63,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
                    🧠
                </div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '0.8rem' }}>Run FedAvg</h2>
                <p style={{ color: 'var(--text-2)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    This will execute `main.py` in the backend environment. It calculates averaged `.json` weights and posts the new CID permanently on-chain.
                </p>
                {result ? (
                    <div className="alert-error" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontWeight: 'bold' }}>✅ Aggregation script triggered!</div>
                        <div style={{ fontSize: '0.8rem' }}>(Disclaimer: Backend Python linkage placeholder - check python logs for details)</div>
                        <button className="btn btn-ghost" onClick={() => setResult(false)} style={{ alignSelf: 'center', marginTop: 10 }}>Reset</button>
                    </div>
                ) : (
                    <button className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem', background: '#f43f5e', borderColor: '#f43f5e', color: 'white' }} onClick={handleAggregate} disabled={running}>
                        {running ? <><div className="spinner" /> ⚙️ Aggregating nodes...</> : '🚀 Trigger Aggregation Sequence'}
                    </button>
                )}
            </div>
        </div>
    )
}

export default function AdminHome() {
    const navigate = useNavigate()
    const account = localStorage.getItem('account') || ''
    const [tab, setTab] = useState('Node Management')

    const logout = () => { localStorage.clear(); navigate('/login') }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            <Navbar tab={tab} setTab={setTab} account={account} onLogout={logout} />

            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '3rem 1.5rem' }}>
                {tab === 'Node Management' && <NodeManagementTab />}
                {tab === 'Verify Client Updates' && <VerifyClientUpdatesTab />}
                {tab === 'Aggregation' && <AggregationTab />}
            </div>
        </div>
    )
}
