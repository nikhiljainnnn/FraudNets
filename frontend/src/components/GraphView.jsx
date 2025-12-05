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
                fgRef.current.zoomToFit(400, 50);
            }, 500);
        }
    }, [graphData]);

    const createNodeObject = useCallback((node) => {
        const group = new THREE.Group();

        const isBlacklisted = node.isBlacklisted;
        const nodeColor = isBlacklisted ? '#ef4444' : '#3b82f6';

        const sphereGeometry = new THREE.SphereGeometry(4, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: nodeColor,
            transparent: true,
            opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        group.add(sphere);

        const glowGeometry = new THREE.RingGeometry(5, 7, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: nodeColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);

        return group;
    }, []);

    const getLinkColor = useCallback((link) => {
        const sourceNode = graphData.nodes.find(n => n.id === link.source || n.id === link.source?.id);
        const targetNode = graphData.nodes.find(n => n.id === link.target || n.id === link.target?.id);

        if (sourceNode?.isBlacklisted || targetNode?.isBlacklisted) {
            return 'rgba(239, 68, 68, 0.6)';
        }
        return 'rgba(59, 130, 246, 0.4)';
    }, [graphData.nodes]);

    const safeNodes = useMemo(() => graphData.nodes.filter(n => !n.isBlacklisted).length, [graphData.nodes]);
    const fraudNodes = useMemo(() => graphData.nodes.filter(n => n.isBlacklisted).length, [graphData.nodes]);

    if (!graphData || graphData.nodes.length === 0) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px'
            }}>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔗</div>
                    <div style={{ fontSize: '12px' }}>No network data</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Run a simulation to build the graph</div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ height: '100%', position: 'relative', background: '#0a0a0f', borderRadius: '6px', overflow: 'hidden' }}>
            <ForceGraph3D
                ref={fgRef}
                width={width || 400}
                height={height || 300}
                graphData={graphData}
                nodeThreeObject={createNodeObject}
                nodeThreeObjectExtend={false}
                linkColor={getLinkColor}
                linkWidth={1.5}
                linkOpacity={0.6}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={getLinkColor}
                backgroundColor="#0a0a0f"
                showNavInfo={false}
            />

            <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                display: 'flex',
                gap: '12px',
                fontSize: '11px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                    <span style={{ color: 'var(--text-secondary)' }}>Safe ({safeNodes})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                    <span style={{ color: 'var(--text-secondary)' }}>Fraud ({fraudNodes})</span>
                </div>
            </div>

            <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                fontSize: '10px',
                color: 'var(--text-tertiary)'
            }}>
                Drag to rotate · Scroll to zoom
            </div>
        </div>
    );
};

export default GraphView;
