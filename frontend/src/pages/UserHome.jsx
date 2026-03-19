import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserProvider, Contract } from 'ethers'

const API = 'http://localhost:4000/api'
const short = (s = '') => s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s
const ago = (ts) => {
    const d = Math.floor((Date.now() - ts * 1000) / 1000)
    if (d < 60) return `${d}s ago`; if (d < 3600) return `${Math.floor(d / 60)}m ago`
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`; return new Date(ts * 1000).toLocaleDateString()
}

function Navbar({ tab, setTab, account, onLogout }) {
    const tabs = ['Dashboard', 'Upload Local Model']
    return (
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(22px) saturate(190%)', WebkitBackdropFilter: 'blur(22px) saturate(190%)', background: 'rgba(6,10,18,0.85)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 1.5rem', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⬡ FedShield</span>
                    <div className="tab-bar">
                        {tabs.map(t => <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span className="badge badge-accent">👤 User</span>
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

function StepBar({ step }) {
    const steps = [{ id: 0, icon: '📁', label: 'Select Data' }, { id: 1, icon: '☁️', label: 'IPFS Upload' }, { id: 2, icon: '🔗', label: 'On-chain Tx' }, { id: 3, icon: '✅', label: 'Complete' }]
    return (
        <div className="step-bar">
            {steps.map((s, i) => {
                const done = step > s.id, active = step === s.id, state = done ? 'done' : active ? 'active' : 'idle'
                return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className={`step-circle ${state}`}>{active && step < 3 ? <div className="spinner" style={{ width: 18, height: 18 }} /> : s.icon}</div>
                            <span className={`step-label ${state}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`step-connector ${done ? 'done' : 'idle'}`} />}
                    </div>
                )
            })}
        </div>
    )
}

function DashboardTab({ data, loading, fetchStats }) {
    return (
        <div>
            {/* Hero */}
            <div className="fade-up" style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className="badge badge-accent">👤 Participant</span>
                    <div className="pulse-dot" />
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>Live · Polygon Amoy Testnet</span>
                </div>
                <h1 style={{ marginBottom: '0.6rem' }}>
                    Welcome to the <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>User Dashboard</span>
                </h1>
                <p style={{ maxWidth: 540, fontSize: '0.94rem' }}>
                    You are a participant node in the FedShield federated learning network. Monitor the global model and upload your trained local model data to IPFS and the blockchain.
                </p>
            </div>

            {/* Stats */}
            <div style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)' }}>Network Status</h2>
                <button className="btn btn-ghost" onClick={fetchStats} style={{ padding: '0.35rem 0.8rem', fontSize: '0.74rem' }}>↻ Refresh</button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" style={{ width: 30, height: 30 }} /></div>
            ) : data ? (
                <>
                    {/* Stat cards */}
                    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { icon: '🔄', label: 'Current Round', value: data.round, color: '#6366f1' },
                            { icon: '📦', label: 'Global Model Versions', value: data.totalVersions, color: '#8b5cf6' },
                            { icon: '👥', label: 'Clients This Round', value: data.clientCount, color: '#0ea5e9' },
                        ].map(({ icon, label, value, color }, i) => (
                            <div key={label} className="glass glass-hover fade-up" style={{ padding: '1.3rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start', animationDelay: `${i * 0.07}s` }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}1a`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{icon}</div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Latest model CID */}
                    {data.latestCid && (
                        <div className="glass fade-up" style={{ padding: '1.3rem 1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg,rgba(99,102,241,0.09),rgba(139,92,246,0.06))', borderColor: 'rgba(99,102,241,0.28)', animationDelay: '0.22s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--accent)', marginBottom: 5 }}>🌐 Latest Global Model</div>
                                    <code style={{ fontSize: '0.8rem', background: 'none', padding: 0, wordBreak: 'break-all' }}>{data.latestCid}</code>
                                </div>
                                <a href={`https://gateway.pinata.cloud/ipfs/${data.latestCid}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.4rem 0.85rem', fontSize: '0.76rem', flexShrink: 0 }}>
                                    ☁️ View on IPFS
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Recent model versions table */}
                    {data.recentVersions?.length > 0 && (
                        <div className="glass fade-up" style={{ overflow: 'hidden', marginBottom: '1.5rem', animationDelay: '0.28s' }}>
                            <div style={{ padding: '0.85rem 1.3rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '0.9rem' }}>📋 Global Model History</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table>
                                    <thead><tr><th>Version</th><th>Round</th><th>IPFS CID</th><th>Recorded</th></tr></thead>
                                    <tbody>
                                        {data.recentVersions.map((v, i) => (
                                            <tr key={i}>
                                                <td><span className="badge badge-accent">v{v.version}</span></td>
                                                <td style={{ color: 'var(--text-2)' }}>{v.round}</td>
                                                <td><a href={v.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{short(v.ipfsCID)}</a></td>
                                                <td style={{ color: 'var(--text-2)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{ago(v.timestamp)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="glass fade-up" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ marginBottom: '1rem' }}>⚠️ Could not reach blockchain server on port 4000.</p>
                    <button className="btn btn-primary" onClick={fetchStats}>Retry</button>
                </div>
            )}
        </div>
    )
}

function UploadLocalModelTab({ onSuccess }) {
    const fileRef = useRef()
    const [file, setFile] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [step, setStep] = useState(0)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const pickFile = (f) => {
        if (!f) return
        if (!f.name.endsWith('.json')) { setError('Only .json files accepted.'); return }
        setError(''); setFile(f); setResult(null); setStep(0)
    }
    const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }, [])

    const submit = async () => {
        if (!file) return
        setError(''); setResult(null); setStep(1)
        const fd = new FormData()
        fd.append('model', file)
        fd.append('pinName', `fedshield_local_${Date.now()}`)
        try {
            await new Promise(r => setTimeout(r, 500)); 
            // 1. Upload to IPFS
            const uploadRes = await fetch(`${API}/upload-model`, { method: 'POST', body: fd })
            const uploadData = await uploadRes.json()
            if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload to IPFS failed')
            
            setStep(2)
            // 2. Register on-chain using the user's connected MetaMask wallet.
            if (!window.ethereum) throw new Error('MetaMask is required to submit transactions.')

            // ── Ensure MetaMask is on Polygon Amoy (chainId 0x13882 = 80002) ─────
            const AMOY_CHAIN_ID = '0x13882'
            const currentChain = await window.ethereum.request({ method: 'eth_chainId' })

            if (currentChain !== AMOY_CHAIN_ID) {
                try {
                    // Try switching first (works if Amoy is already added)
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: AMOY_CHAIN_ID }],
                    })
                } catch (switchErr) {
                    if (switchErr.code === 4902 || switchErr.code === -32603) {
                        // Amoy not in MetaMask — add it
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: AMOY_CHAIN_ID,
                                    chainName: 'Polygon Amoy Testnet',
                                    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                                    rpcUrls: ['https://rpc-amoy.polygon.technology'],
                                    blockExplorerUrls: ['https://amoy.polygonscan.com'],
                                }],
                            })
                        } catch {
                            throw new Error('Please open MetaMask and manually switch to "Polygon Amoy Testnet", then click Upload again.')
                        }
                    } else if (switchErr.code === 4001) {
                        throw new Error('You rejected the network switch. Please switch MetaMask to "Polygon Amoy Testnet" and retry.')
                    } else {
                        throw new Error('Could not switch to Polygon Amoy. Please switch manually in MetaMask and retry.')
                    }
                }

                // Verify the switch actually happened before continuing
                const chainAfterSwitch = await window.ethereum.request({ method: 'eth_chainId' })
                if (chainAfterSwitch !== AMOY_CHAIN_ID) {
                    throw new Error('Network switch incomplete. Please open MetaMask, switch to "Polygon Amoy Testnet" (chainId 80002), then retry.')
                }
            }
            // ─────────────────────────────────────────────────────────────────────

            const provider = new BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()

            // Fetch the contract address from the backend so it's always in sync with .env
            const healthRes = await fetch(`${API}/health`).then(r => r.json())
            const contractAddr = healthRes.contractAddress
            if (!contractAddr) throw new Error('Contract address not provided by backend. Check server .env.')

            const abi = ['function submitLocalUpdate(string _ipfsCID, string _metadata) external']
            const contract = new Contract(contractAddr, abi, signer)

            // Fetch the nonce manually to avoid Metamask/Polygon Amoy returning "undefined" for it.
            // Also use provider.waitForTransaction() instead of tx.wait() to bypass the ethers v6
            // receipt-parse bug where nonce comes back as null on pending txs.
            const nonce = await provider.getTransactionCount(await signer.getAddress(), 'pending')
            const tx = await contract.submitLocalUpdate(
                uploadData.cid,
                `Client Update ${new Date().toISOString()}`,
                { nonce }
            )
            // waitForTransaction polls by hash and avoids re-parsing the raw tx object
            const receipt = await provider.waitForTransaction(tx.hash)

            setStep(3);
            setResult({
                cid: uploadData.cid,
                gateway: uploadData.gateway,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                explorer: `https://www.oklink.com/amoy/tx/${receipt.hash}`
            });
            onSuccess?.()
        } catch (e) { 
            console.error(e)
            setError(e.reason || e.message || 'Transaction failed'); 
            setStep(0) 
        }
    }

    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: 5 }}>Upload Local Model Data</h1>
                <p style={{ margin: 0, fontSize: '0.86rem' }}>Pin your updated local model weights (JSON) to IPFS and submit the transaction.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass fade-up" style={{ padding: '2rem' }}>
                    <StepBar step={step} />
                    <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => step === 0 && fileRef.current.click()}
                        style={{ border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'rgba(34,197,94,0.5)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: '2.5rem', textAlign: 'center', cursor: step === 0 ? 'pointer' : 'default', background: dragging ? 'rgba(99,102,241,0.07)' : file ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.22s' }}>
                        <input ref={fileRef} type="file" accept=".json" hidden onChange={e => pickFile(e.target.files[0])} />
                        {file ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '2.8rem' }}>📄</span>
                                <span style={{ fontWeight: 700 }}>{file.name}</span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                                {step === 0 && <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ padding: '0.28rem 0.7rem', fontSize: '0.72rem' }}>✕ Remove</button>}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '3rem' }}>☁️</span>
                                <p style={{ fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Drag & drop or click to upload</p>
                                <p style={{ fontSize: '0.78rem', margin: 0 }}>Accepts <code>.json</code> model files only</p>
                            </div>
                        )}
                    </div>
                    {error && <div className="alert-error fade-in" style={{ marginTop: '1rem' }}>⚠️ {error}</div>}
                    <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.7rem' }}>
                        <button className="btn btn-primary" onClick={submit} disabled={!file || (step > 0 && step < 3)} style={{ flex: 1, justifyContent: 'center' }}>
                            {step === 1 ? <><div className="spinner" style={{ width: 15, height: 15 }} />Uploading to IPFS…</>
                                : step === 2 ? <><div className="spinner" style={{ width: 15, height: 15 }} />Submitting tx…</>
                                    : step === 3 ? '✅ Upload another' : '🚀 Upload & Submit'}
                        </button>
                        {(step === 3 || error) && <button className="btn btn-ghost" onClick={() => { setFile(null); setStep(0); setResult(null); setError('') }}>↺</button>}
                    </div>
                </div>
                <div className="fade-up" style={{ animationDelay: '0.1s' }}>
                    {result ? (
                        <div className="glass" style={{ padding: '1.6rem', borderColor: 'rgba(34,197,94,0.28)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
                                <span style={{ fontSize: '1.6rem' }}>🎉</span>
                                <div><h3 style={{ color: 'var(--success)', marginBottom: 2 }}>Sent Successfully!</h3><span style={{ fontSize: '0.73rem', color: 'var(--text-2)' }}>Pinned on IPFS · Stored on Polygon Amoy</span></div>
                            </div>
                            {[['IPFS CID', result.cid, result.gateway || `https://gateway.pinata.cloud/ipfs/${result.cid}`], ['Transaction', result.txHash, result.explorer || `https://www.oklink.com/amoy/tx/${result.txHash}`], ['Block', `#${result.blockNumber}`, null]].map(([label, val, link]) => (
                                <div key={label} style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.76rem', wordBreak: 'break-all' }}>{val}</a>
                                        : <span style={{ fontFamily: 'monospace', fontSize: '0.76rem', wordBreak: 'break-all' }}>{val}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass" style={{ padding: '1.6rem' }}>
                            <h3 style={{ fontSize: '0.92rem', marginBottom: '1rem' }}>ℹ️ Submission Process</h3>
                            {[['1', '📤 IPFS Pin', 'Your trained .json data is pinned persistently to IPFS.'], ['2', '🔗 On-chain', 'The CID is submitted as a local update transaction.'], ['3', '✅ Verification', 'Admins can verify and include this client update in the next round.']].map(([n, title, desc]) => (
                                <div key={n} style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.9rem' }}>
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--warning)', flexShrink: 0 }}>{n}</div>
                                    <div><div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2 }}>{title}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{desc}</div></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


export default function UserHome() {
    const navigate = useNavigate()
    const account = localStorage.getItem('account') || ''
    const [tab, setTab] = useState('Dashboard')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        try {
            const [rnd, mdl, vers] = await Promise.all([
                fetch(`${API}/current-round`).then(r => r.json()),
                fetch(`${API}/latest-model`).then(r => r.json()),
                fetch(`${API}/model-versions`).then(r => r.json()),
            ])
            const cr = rnd.currentRound ?? 0
            let clientCount = 0
            try { const cu = await fetch(`${API}/client-updates/${cr}`).then(r => r.json()); clientCount = cu.total || 0 } catch (_) { }
            setData({
                round: cr,
                latestCid: mdl.cid,
                latestGateway: mdl.gateway,
                totalVersions: (vers.versions || []).length,
                recentVersions: (vers.versions || []).slice().reverse(),
                clientCount,
            })
        } catch (_) { } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchStats(); const id = setInterval(fetchStats, 30000); return () => clearInterval(id) }, [fetchStats])

    const logout = () => { localStorage.clear(); navigate('/login') }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            <Navbar tab={tab} setTab={setTab} account={account} onLogout={logout} />

            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '3rem 1.5rem' }}>
                {tab === 'Dashboard' && <DashboardTab data={data} loading={loading} fetchStats={fetchStats} />}
                {tab === 'Upload Local Model' && <UploadLocalModelTab onSuccess={fetchStats} />}
            </div>
        </div>
    )
}
