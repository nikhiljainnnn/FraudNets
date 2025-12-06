import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useResizeDetector } from 'react-resize-detector';
import * as THREE from 'three';

const GraphView = ({ graphData }) => {
    const fgRef = useRef();
    const { width, height, ref: containerRef } = useResizeDetector();

    useEffect(() => {
        if (fgRef.current && graphData.nodes.length > 0) {
            setTimeout(() => {
                fgRef.current.zoomToFit(400, 80);
            }, 500);
        }
    }, [graphData]);

    const createNodeObject = useCallback((node) => {
        const group = new THREE.Group();

        const isBlacklisted = node.isBlacklisted;
        const activity = (node.inDegree || 0) + (node.outDegree || 0);
        const size = Math.max(3, Math.min(8, 3 + activity * 0.5));

        const nodeColor = isBlacklisted ? '#ef4444' : '#3b82f6';

        const sphereGeometry = new THREE.SphereGeometry(size, 24, 24);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: nodeColor,
            transparent: true,
            opacity: 0.95,
            shininess: 100
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        group.add(sphere);

        if (isBlacklisted) {
            const ringGeometry = new THREE.RingGeometry(size + 2, size + 3, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: '#ef4444',
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            group.add(ring);

            const ring2 = new THREE.Mesh(ringGeometry.clone(), ringMaterial.clone());
            ring2.material.opacity = 0.2;
            ring2.scale.set(1.3, 1.3, 1.3);
            group.add(ring2);
        } else if (activity > 3) {
            const glowGeometry = new THREE.RingGeometry(size + 1, size + 2, 32);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: '#3b82f6',
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            group.add(glow);
        }

        return group;
    }, []);

    const getLinkColor = useCallback((link) => {
        const sourceNode = graphData.nodes.find(n => n.id === link.source || n.id === link.source?.id);
        const targetNode = graphData.nodes.find(n => n.id === link.target || n.id === link.target?.id);

        if (sourceNode?.isBlacklisted || targetNode?.isBlacklisted) {
            return 'rgba(239, 68, 68, 0.7)';
        }
        return 'rgba(59, 130, 246, 0.35)';
    }, [graphData.nodes]);

    const getLinkWidth = useCallback((link) => {
        const value = link.value || 1;
        return Math.max(1, Math.min(4, value / 5000));
    }, []);

    const safeNodes = useMemo(() => graphData.nodes.filter(n => !n.isBlacklisted).length, [graphData.nodes]);
    const fraudNodes = useMemo(() => graphData.nodes.filter(n => n.isBlacklisted).length, [graphData.nodes]);

    if (!graphData || graphData.nodes.length === 0) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f18 100%)',
                borderRadius: '6px'
            }}>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto 16px',
                        borderRadius: '50%',
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '28px' }}>🔗</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>No Network Data</div>
                    <div style={{ fontSize: '12px' }}>Run a simulation to build the transaction graph</div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{
            height: '100%',
            position: 'relative',
            background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f18 100%)',
            borderRadius: '6px',
            overflow: 'hidden'
        }}>
            <ForceGraph3D
                ref={fgRef}
                width={width || 400}
                height={height || 300}
                graphData={graphData}
                nodeThreeObject={createNodeObject}
                nodeThreeObjectExtend={false}
                linkColor={getLinkColor}
                linkWidth={getLinkWidth}
                linkOpacity={0.7}
                linkDirectionalParticles={3}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.008}
                linkDirectionalParticleColor={getLinkColor}
                backgroundColor="rgba(0,0,0,0)"
                showNavInfo={false}
                enableNodeDrag={true}
                enableNavigationControls={true}
                controlType="orbit"
            />

            <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '11px'
            }}>
                <div style={{
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '6px',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>
                        <span style={{ color: '#a1a1aa' }}>Safe Accounts ({safeNodes})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div>
                        <span style={{ color: '#a1a1aa' }}>Blacklisted ({fraudNodes})</span>
                    </div>
                </div>
            </div>

            <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                fontSize: '10px',
                color: 'rgba(161, 161, 170, 0.6)',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '4px'
            }}>
                Drag to rotate • Scroll to zoom • Click node to focus
            </div>
        </div>
    );
};

export default GraphView;
