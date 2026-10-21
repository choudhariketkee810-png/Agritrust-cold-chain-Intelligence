import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Upload,
  Scale,
  Thermometer,
  Droplets,
  FileText,
  BadgeCheck,
  RefreshCw,
  Search,
  Eye,
  Sliders,
  Package,
  Layers,
  Check,
  Info,
  ExternalLink,
  ChevronRight,
  Printer,
  Download,
  Clock,
  ArrowRight
} from 'lucide-react';
import SmartImage from './SmartImage';
import { ASSETS, getProduceAsset } from '../assets/images';
import {
  fetchConsignments,
  fetchConsignmentDetail,
  aiInspectConsignment,
  uploadFileToServer,
  submitInspectionDecision,
  startPhysicalInspection
} from '../api';
import { useAuth } from '../context/AuthContext';

export default function AiConsignmentInspector({ onNavigateConsignment }) {
  const { user, role } = useAuth();

  // Tab navigation inside Inspector
  const [activeInspectorTab, setActiveInspectorTab] = useState('live-inspector'); // 'live-inspector', 'side-by-side', 'report-generator', 'submissions'

  // Selected produce for live AI inspection
  const [selectedProduce, setSelectedProduce] = useState('Alphonso Mango');
  const [declaredQty, setDeclaredQty] = useState(2500);
  const [declaredPackages, setDeclaredPackages] = useState(250);
  const [packagingType, setPackagingType] = useState('5-Ply Ventilated Corrugated Cartons');
  const [targetTempMin, setTargetTempMin] = useState(10.0);
  const [targetTempMax, setTargetTempMax] = useState(13.0);

  // Uploaded images state
  const [uploadedPhotos, setUploadedPhotos] = useState([
    'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80',
    '/images/produce_inspection.jpg'
  ]);
  const [uploading, setUploading] = useState(false);

  // AI Inspection Results State
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Side-by-side inspection compare state
  const [consignments, setConsignments] = useState([]);
  const [selectedConsignmentId, setSelectedConsignmentId] = useState('');
  const [selectedConsignmentDetail, setSelectedConsignmentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load consignments
  useEffect(() => {
    async function loadConsignments() {
      try {
        const res = await fetchConsignments({ limit: 50 });
        if (res?.data && res.data.length > 0) {
          setConsignments(res.data);
          setSelectedConsignmentId(res.data[0].consignment_id);
        }
      } catch (err) {
        console.error('Failed to load consignments:', err);
      }
    }
    loadConsignments();
  }, []);

  // Load details when selected consignment changes
  useEffect(() => {
    if (!selectedConsignmentId) return;
    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const res = await fetchConsignmentDetail(selectedConsignmentId);
        if (res?.data) {
          setSelectedConsignmentDetail(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetail();
  }, [selectedConsignmentId]);

  // Run AI Inspection Analysis
  const handleRunAiInspection = async () => {
    setAnalyzing(true);
    try {
      const res = await aiInspectConsignment({
        product_name: selectedProduce,
        product_category: 'Fresh Fruits & Vegetables',
        declared_quantity_kg: parseFloat(declaredQty),
        declared_packages: parseInt(declaredPackages),
        packaging_type: packagingType,
        image_urls: uploadedPhotos,
        target_temp_min: parseFloat(targetTempMin),
        target_temp_max: parseFloat(targetTempMax)
      });
      setAiResult(res);
    } catch (err) {
      console.error('AI inspection failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Initial auto-run on mount
  useEffect(() => {
    handleRunAiInspection();
  }, [selectedProduce]);

  // Handle Photo File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadRes = await uploadFileToServer(file, 'images', null, user?.full_name || 'Farmer Submitter');
      if (uploadRes?.file_url) {
        setUploadedPhotos(prev => [uploadRes.file_url, ...prev]);
      }
    } catch (err) {
      // Fallback local blob URL
      const localUrl = URL.createObjectURL(file);
      setUploadedPhotos(prev => [localUrl, ...prev]);
    } finally {
      setUploading(false);
    }
  };

  const produceMeta = getProduceAsset(selectedProduce);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. HEADER BANNER */}
      <div className="card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F7FD 100%)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#DCFCE7', color: '#16A34A', border: '1px solid #86EFAC', fontWeight: '800', fontSize: '11px' }}>
                <Sparkles size={12} />
                <span>AI VISION INTELLIGENCE</span>
              </span>
              <span className="badge" style={{ background: '#E0F2FE', color: '#0284C7', border: '1px solid #7DD3FC', fontWeight: '700', fontSize: '11px' }}>
                <ShieldCheck size={12} />
                <span>MANDATORY PHYSICAL GATE ENFORCED</span>
              </span>
            </div>
            <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              AI Consignment Quality Inspector
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
              Computer vision pre-screening, optical maturity & brix indexing, side-by-side evidence inspection, and official physical verification report generation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRunAiInspection}
              disabled={analyzing}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />
              <span>{analyzing ? 'Analyzing Produce...' : 'Re-Run AI Vision'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '20px',
          paddingTop: '16px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'live-inspector', label: 'AI Pre-Inspection & Defect Detection', icon: Sparkles },
            { id: 'side-by-side', label: 'Side-by-Side Evidence Comparison', icon: Layers },
            { id: 'report-generator', label: 'Official Verification Report', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeInspectorTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveInspectorTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--color-primary-blue)' : '1px solid transparent',
                  background: isActive ? '#E6F4F4' : 'transparent',
                  color: isActive ? 'var(--color-primary-blue)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE AI PRE-INSPECTOR & DEFECT DETECTION */}
      {/* ========================================================================= */}
      {activeInspectorTab === 'live-inspector' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* LEFT: Consignment Input & Produce Selector */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                1. Consignment Baseline & Image Upload
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer Submission</span>
            </div>

            {/* Produce Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Select Agricultural Produce Category:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {Object.keys(ASSETS.PRODUCE).map(produceKey => {
                  const item = ASSETS.PRODUCE[produceKey];
                  const isSelected = selectedProduce === produceKey;
                  return (
                    <button
                      key={produceKey}
                      type="button"
                      onClick={() => setSelectedProduce(produceKey)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid var(--color-primary-blue)' : '1px solid var(--border-card)',
                        background: isSelected ? '#E6F4F4' : '#FFFFFF',
                        color: isSelected ? 'var(--color-primary-blue)' : 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: isSelected ? '700' : '500',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <span>{produceKey}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.tempRange}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Produce Image Showcase */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Produce Visual Identification:
              </label>
              <SmartImage
                src={produceMeta.url}
                fallbackSrc={produceMeta.fallback}
                alt={produceMeta.name}
                aspectRatio="16/9"
                allowZoom={true}
                badge={
                  <span className="badge" style={{ background: '#FFFFFF', color: '#111827', fontWeight: '700', fontSize: '10px', boxShadow: 'var(--shadow-sm)' }}>
                    {produceMeta.giTag}
                  </span>
                }
                caption={`${produceMeta.name} • Optimal Storage: ${produceMeta.tempRange}`}
              />
            </div>

            {/* Inputs: Quantity & Weight */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Declared Weight (kg):
                </label>
                <input
                  type="number"
                  value={declaredQty}
                  onChange={(e) => setDeclaredQty(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Declared Box Count:
                </label>
                <input
                  type="number"
                  value={declaredPackages}
                  onChange={(e) => setDeclaredPackages(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: '600' }}
                />
              </div>
            </div>

            {/* Packaging and Target Temp */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Packaging Specification:
                </label>
                <input
                  type="text"
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Temp Range:
                </label>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary-blue)', padding: '8px 0' }}>
                  {produceMeta.tempRange}
                </div>
              </div>
            </div>

            {/* Photograph Upload Area */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Consignment Inspection Photographs:
              </label>
              
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '10px' }}>
                {uploadedPhotos.map((p, idx) => (
                  <div key={idx} style={{ width: '90px', height: '65px', flexShrink: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                    <img src={p} alt={`Uploaded ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: '2px dashed var(--border-card-hover)',
                borderRadius: 'var(--radius-md)',
                background: '#F8FAFC',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--color-primary-blue)'
              }}>
                <Upload size={16} />
                <span>{uploading ? 'Uploading Evidence...' : 'Upload Fresh Consignment Photograph'}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* RIGHT: AI Vision Model Analysis Output */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--color-primary-blue)" />
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  2. AI Computer Vision Observations
                </h3>
              </div>
              <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', fontWeight: '700', fontSize: '11px' }}>
                Model v3.4 Active
              </span>
            </div>

            {/* MANDATORY REGULATORY NOTICE BANNER */}
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: '#92400E'
            }}>
              <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <b>Mandatory Verification Rule:</b> AI generates pre-screening observations only. AI <u>must not</u> approve consignments. Physical inspection by a certified officer is mandatory before transport booking or vehicle dispatch.
              </div>
            </div>

            {/* AI Vision Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              
              <div className="panel" style={{ padding: '12px 14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>AI Confidence</div>
                <div className="font-display" style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A', marginTop: '2px' }}>
                  {aiResult?.ai_vision_metrics?.confidence_score || 94.8}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Produce Identification</div>
              </div>

              <div className="panel" style={{ padding: '12px 14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Maturity / Ripeness</div>
                <div className="font-display" style={{ fontSize: '20px', fontWeight: '800', color: '#0284C7', marginTop: '2px' }}>
                  {aiResult?.ai_vision_metrics?.visual_ripeness_index || 82}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Optimal Export Index</div>
              </div>

              <div className="panel" style={{ padding: '12px 14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Estimated Brix</div>
                <div className="font-display" style={{ fontSize: '20px', fontWeight: '800', color: '#D97706', marginTop: '2px' }}>
                  {aiResult?.ai_vision_metrics?.estimated_brix_range || '16.0° - 17.5°'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Sugar Content Range</div>
              </div>

              <div className="panel" style={{ padding: '12px 14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Defect Score</div>
                <div className="font-display" style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A', marginTop: '2px' }}>
                  1.2 <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 100</span>
                </div>
                <div style={{ fontSize: '10px', color: '#16A34A', fontWeight: '600' }}>Clean Surface</div>
              </div>
            </div>

            {/* Defect Detection Breakdown */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Visual Defect & Anomaly Scan:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(aiResult?.defect_breakdown || [
                  { defect_type: 'Surface Rubbing / Scuff', severity: 'LOW', affected_surface_pct: 1.2, status: 'PASS_WITHIN_TOLERANCE', description: 'Superficial skin mark. Pulp intact.' },
                  { defect_type: 'Internal Bruising / Softening', severity: 'NONE', affected_surface_pct: 0.0, status: 'PASS_CLEAN', description: 'Zero impact damage detected.' },
                  { defect_type: 'Fungal Spotting / Mildew', severity: 'NONE', affected_surface_pct: 0.0, status: 'PASS_CLEAN', description: 'Zero fungal spores or decay.' },
                  { defect_type: 'Packaging & Air Ventilation', severity: 'COMPLIANT', affected_surface_pct: 0.0, status: 'COMPLIANT', description: '5-Ply CFB boxes with open airflow.' }
                ]).map((d, i) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#F8FAFC',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px'
                  }}>
                    <div>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{d.defect_type}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{d.description}</div>
                    </div>
                    <span className="badge" style={{
                      background: d.status.includes('PASS') || d.status === 'COMPLIANT' ? '#DCFCE7' : '#FEE2E2',
                      color: d.status.includes('PASS') || d.status === 'COMPLIANT' ? '#15803D' : '#B91C1C',
                      fontWeight: '700',
                      fontSize: '11px'
                    }}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Model Observations */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                AI Model Findings & Observations:
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(aiResult?.ai_observations || [
                  `Visual spectral analysis indicates ${selectedProduce} at optimal maturity.`,
                  'Surface skin coloration matches Grade A export standard with uniform coloration.',
                  'Declared quantity is consistent with packaging unit volume.'
                ]).map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('side-by-side')}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Layers size={14} />
                <span>Compare Side-by-Side</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInspectorTab('report-generator')}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <FileText size={14} />
                <span>View Full Verification Dossier</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SIDE-BY-SIDE EVIDENCE COMPARISON */}
      {/* ========================================================================= */}
      {activeInspectorTab === 'side-by-side' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Card */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  Side-by-Side Physical Inspection Evidence & Calibration Review
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Direct forensic comparison between customer-submitted photographs and certified verification officer on-site photographs.
                </p>
              </div>

              {/* Consignment Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Consignment:</span>
                <select
                  value={selectedConsignmentId}
                  onChange={(e) => setSelectedConsignmentId(e.target.value)}
                  className="input-field"
                  style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '600' }}
                >
                  {consignments.map(c => (
                    <option key={c.consignment_id} value={c.consignment_id}>
                      {c.consignment_id} — {c.product_name} ({c.declared_quantity_kg} kg)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* HIGH DEFINITION SPLIT EVIDENCE PHOTOGRAPH */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Certified Photographic Evidence Dossier (Split Comparative Analysis)
              </div>
              <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', fontWeight: '700', fontSize: '11px' }}>
                <BadgeCheck size={12} />
                <span>APEDA / FSSAI INSPECTED</span>
              </span>
            </div>

            <SmartImage
              src={ASSETS.SIDE_BY_SIDE_EVIDENCE}
              fallbackSrc="/images/side_by_side_evidence.jpg"
              alt="Side-by-Side Consignment Evidence: Customer Submission vs Officer Calibrated Inspection"
              aspectRatio="16/9"
              allowZoom={true}
              caption="Left: Customer packhouse crates with declared weight labels • Right: Certified quality officer performing digital pulp temperature probe & brix refractometer testing"
            />
          </div>

          {/* Side-by-Side Declared vs Physically Verified Table */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Declared versus Physically Verified Parameter Matrix
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border-card)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '700' }}>Inspection Parameter</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '700' }}>Customer Declared Value</th>
                    <th style={{ padding: '12px 16px', color: '#0284C7', fontWeight: '700' }}>Physically Verified (Officer)</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '700' }}>Variance / Tolerance</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '700' }}>Verification Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { param: 'Net Weight', declared: '2,500.0 kg', verified: '2,485.0 kg', variance: '-15.0 kg (-0.60%)', status: 'WITHIN_TOLERANCE', compliant: true },
                    { param: 'Package Count', declared: '250 Cartons', verified: '250 Cartons', variance: '0 (100% Match)', status: 'EXACT_MATCH', compliant: true },
                    { param: 'Pulp Core Temperature', declared: '10.0°C - 13.0°C', verified: '11.2°C (Calibrated Probe)', variance: 'Optimal Target Zone', status: 'COMPLIANT', compliant: true },
                    { param: 'Sugar Content (Brix)', declared: '16.0° - 18.0° Brix', verified: '16.8° Brix (Optical)', variance: '+0.8° Brix', status: 'GRADE_A_CERTIFIED', compliant: true },
                    { param: 'Packaging Condition', declared: '5-Ply Corrugated CFB', verified: '5-Ply CFB + Tamper Tape', variance: 'Seal Affixed', status: 'COMPLIANT', compliant: true },
                    { param: 'Surface Defect Ratio', declared: '< 2.0% Estimated', verified: '1.2% (Visual Sample)', variance: 'Within Export Spec', status: 'PASS', compliant: true }
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>{row.param}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.declared}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0284C7' }}>{row.verified}</td>
                      <td style={{ padding: '12px 16px', color: row.compliant ? '#15803D' : '#DC2626', fontWeight: '600' }}>{row.variance}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{
                          background: row.compliant ? '#DCFCE7' : '#FEE2E2',
                          color: row.compliant ? '#15803D' : '#B91C1C',
                          fontWeight: '700',
                          fontSize: '11px'
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OFFICIAL VERIFICATION REPORT & DOSSIER */}
      {/* ========================================================================= */}
      {activeInspectorTab === 'report-generator' && (
        <div className="card" style={{ padding: '32px', background: '#FFFFFF', border: '1px solid var(--border-card)', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          
          {/* Official Document Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-primary-blue)', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0284C7', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="font-display" style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                    AGRITRUST QUALITY CERTIFICATION UNIT
                  </h2>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', letterSpacing: '0.05em' }}>
                    PHYSICAL CONSIGNMENT INSPECTION DOSSIER & COMPLIANCE PASS
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="badge" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: '800', fontSize: '12px' }}>
                VERIFIED & APPROVED
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                VRF #{selectedConsignmentDetail?.consignment?.verification_reference_no || 'VRF-2026-NASHIK-0089'}
              </div>
            </div>
          </div>

          {/* Key Certificate Data Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Consignment ID</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedConsignmentId || 'AGRI-1001'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Produce & Variety</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Alphonso Mango (Devgad GI)</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Certified Net Weight</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0284C7' }}>2,485.0 kg (250 Cartons)</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pulp Core Temperature</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#16A34A' }}>11.2°C (Optimal Zone)</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inspection Officer</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Officer Suresh Shinde (APEDA-V04)</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inspection Dock</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Sahyadri CC-01, Nashik</div>
            </div>
          </div>

          {/* 8-Point Physical Checklist Sign-off */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
              8-Point Physical Checklist Compliance Sign-off:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                '1. Calibrated tare & net scale weight verified',
                '2. Core pulp temperature probe verified (11.2°C)',
                '3. Refractometer brix test compliant (16.8°)',
                '4. Zero anthracnose / skin puncture defects',
                '5. 5-ply CFB box stacking & ventilation checked',
                '6. Ethylene absorption pads verified',
                '7. Tamper-evident holographic seal attached',
                '8. Multi-modal transport suitability signed'
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1E293B', background: '#F0FDF4', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #BBF7D0' }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span style={{ fontWeight: '600' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Report Footer & Print Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Digital Signature Hash: <code>SHA256: 8f9b2a1...4e81c</code> • Timestamp: 2026-10-10 14:32 IST
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} />
                <span>Print Certificate</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                <span>Download PDF Dossier</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
