import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { ACTIVE_THEME, THEMES } from '../theme';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
export interface NodeData {
    id: string;
    label: string;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    parentId?: string | null; // Pour savoir si on doit repositionner
    distance?: number;
    isSatellite?: boolean;
    description?: string;
}

export interface EdgeData {
    id: string;
    source: string;
    target: string;
    growFrom: string; // Le noeud depuis lequel le lien "part"
    distance?: number;
}

interface ConstellationProps {
    centerWord: string;
    relatedWords: string[];
    onWordClick: (word: string) => void;
    forceConnectTo?: string | null;
    parentsMap?: Record<string, string>;
    isLoading?: boolean;
    nodeCount?: number;
    activeTheme: string;
    labelsOpaque?: boolean;
    showSatellites?: boolean;
    externalEdges?: Set<string>;
    allNodesOnMap?: string[];
    onGenerateConnexesClick?: (word: string) => void;
    loadingConnexes?: boolean;
    onGenerateSatellitesClick?: (word: string) => void;
    loadingSatellites?: boolean;
    satelliteBrandables?: { name: string; desc: string }[];
    onZoomChange?: (zoom: number) => void;
}

// --- Constantes visuelles ---
const ACTIVE_RADIUS = 0.85;
const NODE_RADIUS = 0.4;
const HIT_RADIUS_ACTIVE = 2.2;
const HIT_RADIUS_NODE = 1.4;
const TARGET_DIST = 16;
const MIN_DIST = 11.5;

const getDynamicZoomSettings = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
        defaultZoom: isMobile ? 14 : 25,
        maxSatZoom: isMobile ? 10 : 18
    };
};



/**
 * Node — Cercle 2D billboard (toujours face caméra)
 */
const Node = React.memo(({
    data,
    isActive,
    nodePositionsRef,
    onClick,
    distance = 0,
    isLoading,
    theme,
    labelsOpaque = false,
    showSatellites = true,
    onGenerateConnexesClick,
    loadingConnexes,
    onGenerateSatellitesClick,
    loadingSatellites,
    isSelectedSatellite,
    setSelectedSatellite,
}: {
    data: NodeData;
    isActive: boolean;
    nodePositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
    onClick: (id: string) => void;
    distance?: number;
    isLoading?: boolean;
    theme: any;
    labelsOpaque?: boolean;
    showSatellites?: boolean;
    onGenerateConnexesClick?: (word: string) => void;
    loadingConnexes?: boolean;
    onGenerateSatellitesClick?: (word: string) => void;
    loadingSatellites?: boolean;
    isSelectedSatellite?: boolean;
    setSelectedSatellite?: (sat: {name: string, desc: string} | null) => void;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const currentPos = useRef(new THREE.Vector3().copy(data.startPos));
    const [hovered, setHovered] = useState(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    useEffect(() => {
        if (hovered) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'auto';
        }
        return () => {
            document.body.style.cursor = 'auto';
        };
    }, [hovered]);

    useEffect(() => {
        nodePositionsRef.current.set(data.id, currentPos.current);
    }, [data.id, nodePositionsRef]);

    const circleMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const cross1MatRef = useRef<THREE.MeshBasicMaterial>(null);
    const cross2MatRef = useRef<THREE.MeshBasicMaterial>(null);
    const labelRef = useRef<any>(null);

    // Dégradé de réseau sémantique très subtil (recommandation utilisateur : baisse constante de 10% par degré)
    const subtleNetworkOpacity = distance === 0 
        ? 1.0 
        : (distance === 1 
            ? 0.90 
            : (distance === 2 ? 0.80 : 0.70));

    // Opacité de base selon le mode de Focus choisi (Satellite Focus vs Network Focus)
    const baseOpacity = data.isSatellite
        ? (showSatellites ? 1.0 : 0.15)
        : (distance === 0
            ? 1.0
            : (showSatellites ? 0.15 : subtleNetworkOpacity));

    const initialNodeOpacity = baseOpacity;
    const initialLabelOpacity = data.isSatellite 
        ? baseOpacity 
        : (distance === 0 ? 1.0 : (labelsOpaque ? baseOpacity : 0.0));

    useFrame(({ camera, clock }) => {
        // Ralentissement de la translation (0.05 -> 0.02)
        currentPos.current.lerp(data.targetPos, 0.02);
        if (groupRef.current) {
            groupRef.current.position.copy(currentPos.current);
            groupRef.current.quaternion.copy(camera.quaternion);

            // Animation de respiration (pulse) si en cours de chargement et actif
            if (isActive && isLoading) {
                const pulse = 1 + Math.sin(clock.elapsedTime * 2) * 0.1;
                groupRef.current.scale.set(pulse, pulse, pulse);
            } else {
                groupRef.current.scale.set(1, 1, 1);
            }
        }

        // --- CALCUL DE L'OPACITÉ DYNAMIQUE SELON LE ZOOM ---
        const zoom = (camera as THREE.OrthographicCamera).zoom;
        const { defaultZoom, maxSatZoom } = getDynamicZoomSettings();
        // zoomFactor: 1 quand on est dézoomé au max (6), 0 quand on est au zoom par défaut
        const zoomFactor = 1 - THREE.MathUtils.smoothstep(zoom, 6, defaultZoom);
        const currentOpacity = baseOpacity + (1.0 - baseOpacity) * zoomFactor;

        // Satellite specific opacity transition
        const satZoomFactor = THREE.MathUtils.smoothstep(zoom, 6, maxSatZoom);
        const satOpacity = satZoomFactor * (showSatellites ? 1.0 : 0.15);

        const nodeOpacity = data.isSatellite 
            ? satOpacity 
            : (distance === 0 ? 1.0 : currentOpacity);

        const labelTextOpacity = data.isSatellite 
            ? satOpacity 
            : (distance === 0 
                ? 1.0 
                : (labelsOpaque ? currentOpacity : (distance === 1 ? nodeOpacity : 0.0)));

        // Mise à jour directe des matériaux pour la performance
        if (circleMatRef.current) {
            circleMatRef.current.opacity = nodeOpacity;
            if (!isActive) {
                const baseColorStr = data.isSatellite 
                    ? (theme.id === 'POETIC_LIGHT' ? '#f59e0b' : '#fbbf24') 
                    : theme.colors.secondary.slice(0, 7);
                const c1 = new THREE.Color(hovered ? '#ffffff' : baseColorStr);
                const c2 = new THREE.Color(theme.colors.primary.slice(0, 7));
                c1.lerp(c2, zoomFactor);
                circleMatRef.current.color.copy(c1);
            }
        }
        if (glowMatRef.current) {
            const glowBase = isActive ? 0.18 : (hovered ? 0.08 : 0.03);
            glowMatRef.current.opacity = glowBase * nodeOpacity;
        }
        if (ringMatRef.current) ringMatRef.current.opacity = 0.5 * nodeOpacity;
        if (cross1MatRef.current) cross1MatRef.current.opacity = 0.3 * nodeOpacity;
        if (cross2MatRef.current) cross2MatRef.current.opacity = 0.3 * nodeOpacity;

        // Mise à jour du label HTML (couleur et opacité)
        if (labelRef.current) {
            if (!data.isSatellite) {
                labelRef.current.style.color = isActive ? 'var(--theme-bg)' : theme.colors.text;
            }
            labelRef.current.style.opacity = `${labelTextOpacity}`;
        }
    });

    const nodeR = data.isSatellite ? NODE_RADIUS * 0.75 : (isActive ? ACTIVE_RADIUS : NODE_RADIUS);
    const hitR = isActive ? HIT_RADIUS_ACTIVE : HIT_RADIUS_NODE;
    const glowR = nodeR * 2.4;

    const formattedLabel = data.label.charAt(0).toUpperCase() + data.label.slice(1).toLowerCase();

    return (
        <group ref={groupRef}>
            <mesh
                onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if (data.isSatellite) {
                        if (setSelectedSatellite) {
                            if (isSelectedSatellite) {
                                setSelectedSatellite(null);
                            } else {
                                setSelectedSatellite({ name: data.label, desc: data.description || '' });
                            }
                        }
                    } else {
                        onClick(data.id); 
                    }
                }}
            >
                <circleGeometry args={[hitR, 32]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>

            <mesh raycast={() => null} renderOrder={9}>
                <circleGeometry args={[glowR, 32]} />
                <meshBasicMaterial
                    ref={glowMatRef}
                    color={(isActive ? theme.colors.primary : (data.isSatellite ? (theme.id === 'POETIC_LIGHT' ? '#f59e0b' : '#fbbf24') : '#ffffff')).slice(0, 7)}
                    transparent
                    opacity={(isActive ? 0.18 : (hovered ? 0.08 : 0.03)) * initialNodeOpacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh raycast={() => null} renderOrder={10}>
                <circleGeometry args={[nodeR, 4]} />
                <meshBasicMaterial
                    ref={circleMatRef}
                    color={(isActive ? theme.colors.primary : (data.isSatellite ? (theme.id === 'POETIC_LIGHT' ? '#f59e0b' : '#fbbf24') : (hovered ? '#ffffff' : theme.colors.secondary))).slice(0, 7)}
                    transparent
                    opacity={initialNodeOpacity}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Hover ring for satellite nodes */}
            {!isActive && hovered && (
                <mesh raycast={() => null} renderOrder={11}>
                    <ringGeometry args={[nodeR * 1.6, nodeR * 1.9, 24]} />
                    <meshBasicMaterial
                        ref={ringMatRef}
                        color={theme.colors.primary.slice(0, 7)}
                        transparent
                        opacity={0.5 * initialNodeOpacity}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* Precision Crosshair on Node */}
            {(isActive || hovered) && (
                <group rotation={[0, 0, Math.PI / 4]} renderOrder={12}>
                    <mesh raycast={() => null}>
                        <boxGeometry args={[nodeR * 3, 0.01, 0.01]} />
                        <meshBasicMaterial ref={cross1MatRef} color="#ffffff" transparent opacity={0.3 * initialNodeOpacity} depthWrite={false} />
                    </mesh>
                    <mesh raycast={() => null} rotation={[0, 0, Math.PI / 2]}>
                        <boxGeometry args={[nodeR * 3, 0.01, 0.01]} />
                        <meshBasicMaterial ref={cross2MatRef} color="#ffffff" transparent opacity={0.3 * initialNodeOpacity} depthWrite={false} />
                    </mesh>
                </group>
            )}

            <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                {data.isSatellite ? (
                    <div
                        ref={labelRef}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            transform: 'translate3d(0, 22px, 0)',
                            whiteSpace: 'nowrap',
                            opacity: initialLabelOpacity,
                            transition: 'all 0.3s ease-out',
                            textShadow: '0 0 10px rgba(251, 191, 36, 0.25)'
                        }}
                    >
                        <span
                            style={{
                                fontSize: '15px',
                                fontWeight: 500,
                                fontFamily: 'var(--app-font-display)',
                                fontStyle: 'italic',
                                color: theme.id === 'POETIC_LIGHT' ? '#d97706' : '#fbbf24',
                                letterSpacing: '0.08em',
                                textShadow: isSelectedSatellite ? '0 0 15px rgba(251, 191, 36, 0.8)' : '0 0 10px rgba(251, 191, 36, 0.25)',
                                opacity: isSelectedSatellite ? 1.0 : (hovered ? 0.9 : 0.7),
                                transition: 'all 0.2s ease-out'
                            }}
                        >
                            {formattedLabel}
                        </span>
                    </div>
                ) : isActive ? (
                    <div
                        ref={labelRef}
                        style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '8px',
                            transform: isMobile ? 'translate3d(0, 52px, 0)' : 'translate3d(0, 45px, 0)',
                            opacity: 1.0,
                            transition: 'all 0.3s ease-out',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <span
                            className="graph-label font-medium"
                            style={{
                                display: 'block',
                                pointerEvents: 'none',
                                userSelect: 'none',
                                color: 'var(--theme-bg)',
                                background: 'var(--theme-primary)',
                                padding: '4px 10px',
                                border: '1px solid var(--theme-primary)',
                                fontSize: isMobile ? '13px' : '14px',
                                fontWeight: 500,
                                fontFamily: 'var(--app-font-display)',
                                fontStyle: 'normal',
                                letterSpacing: '0.15em',
                                boxShadow: '0 0 20px rgba(245, 166, 35, 0.45)',
                            }}
                        >
                            {formattedLabel}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
                            {onGenerateConnexesClick && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGenerateConnexesClick(data.label);
                                    }}
                                    title="Générer les mots connexes (étendre le réseau)"
                                    className="w-[36px] h-[36px] sm:w-[28px] sm:h-[28px]"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid var(--theme-primary)',
                                        background: 'var(--theme-card)',
                                        color: 'var(--theme-primary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s ease',
                                        pointerEvents: 'auto',
                                        boxShadow: '0 0 10px rgba(245, 166, 35, 0.2)',
                                        fontFamily: 'var(--app-font-body)',
                                        borderRadius: '50%'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--theme-primary)';
                                        e.currentTarget.style.color = 'var(--theme-bg)';
                                        e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 166, 35, 0.6)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--theme-card)';
                                        e.currentTarget.style.color = 'var(--theme-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 10px rgba(245, 166, 35, 0.2)';
                                    }}
                                >
                                    {loadingConnexes ? '...' : '+'}
                                </button>
                            )}
                            {onGenerateSatellitesClick && data.id === data.label.toLowerCase() && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGenerateSatellitesClick(data.label);
                                    }}
                                    title="Générer de nouveaux satellites"
                                    className="w-[36px] h-[36px] sm:w-[28px] sm:h-[28px]"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid var(--theme-primary)',
                                        background: 'var(--theme-card)',
                                        color: 'var(--theme-primary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s ease',
                                        pointerEvents: 'auto',
                                        boxShadow: '0 0 10px rgba(245, 166, 35, 0.2)',
                                        fontFamily: 'var(--app-font-body)',
                                        borderRadius: '50%'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--theme-primary)';
                                        e.currentTarget.style.color = 'var(--theme-bg)';
                                        e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 166, 35, 0.6)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--theme-card)';
                                        e.currentTarget.style.color = 'var(--theme-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 10px rgba(245, 166, 35, 0.2)';
                                    }}
                                >
                                    {loadingSatellites ? '...' : '+S'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <span
                        ref={labelRef}
                        className="graph-label font-medium"
                        style={{
                            display: 'block',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            color: theme.colors.text,
                            background: 'transparent',
                            padding: '0',
                            border: 'none',
                            fontSize: isMobile ? '12px' : '15px',
                            fontWeight: distance === 1 ? 400 : 300,
                            fontFamily: 'var(--app-font-display)',
                            fontStyle: 'normal',
                            letterSpacing: distance <= 1 ? '0.15em' : '0.05em',
                            textTransform: 'none',
                            textShadow: distance <= 1
                                ? '0 0 15px rgba(255,255,255,0.2)'
                                : 'none',
                            boxShadow: 'none',
                            transform: `translate3d(0, ${isMobile ? (distance === 1 ? 26 : 18) : (distance === 1 ? 35 : 22)}px, 0)`,
                            whiteSpace: 'nowrap',
                            opacity: initialLabelOpacity,
                            transition: 'all 0.3s ease-out'
                        }}
                    >
                        {formattedLabel}
                    </span>
                )}
            </Html>
        </group>
    );
});

/**
 * Edge — Ligne de connexion
 */
const Edge = React.memo(({
    sourceId,
    targetId,
    nodePositionsRef,
    growFromId,
    distance = 0,
    theme,
    showSatellites = true,
}: {
    sourceId: string;
    targetId: string;
    nodePositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
    growFromId: string;
    distance?: number;
    theme: any;
    showSatellites?: boolean;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    const progress = useRef(0);

    const isSatEdge = sourceId.startsWith('sat-') || targetId.startsWith('sat-');
    const subtleEdgeOpacity = distance <= 1 ? 0.90 : (distance <= 2 ? 0.80 : 0.70);
    const baseOpacity = isSatEdge
        ? (showSatellites ? 0.8 : 0.1)
        : (showSatellites ? 0.15 : (distance <= 0.5 ? 1.0 : subtleEdgeOpacity));

    useFrame(({ camera }, delta) => {
        const p1 = nodePositionsRef.current.get(sourceId);
        const p2 = nodePositionsRef.current.get(targetId);

        if (p1 && p2 && meshRef.current) {
            // Animation du progrès (environ 0.6s)
            if (progress.current < 1) {
                progress.current += delta * 1.6;
                if (progress.current > 1) progress.current = 1;
            }

            const originPos = nodePositionsRef.current.get(growFromId) || p1;
            const targetPos = (originPos === p1) ? p2 : p1;

            const direction = new THREE.Vector3().subVectors(targetPos, originPos);
            const fullLength = direction.length();
            const currentLength = fullLength * progress.current;

            const dir = direction.clone().normalize();
            meshRef.current.position.copy(originPos).add(dir.clone().multiplyScalar(currentLength * 0.5));
            meshRef.current.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                dir
            );
            meshRef.current.scale.set(1, currentLength, 1);
        }

        // --- CALCUL DE L'OPACITÉ DYNAMIQUE SELON LE ZOOM ---
        const zoom = (camera as THREE.OrthographicCamera).zoom;
        const { defaultZoom, maxSatZoom } = getDynamicZoomSettings();
        // zoomFactor: 1 quand on est dézoomé au max (6), 0 quand on est au zoom par défaut
        const zoomFactor = 1 - THREE.MathUtils.smoothstep(zoom, 6, defaultZoom);
        const currentOpacity = baseOpacity + (1.0 - baseOpacity) * zoomFactor;

        const isLight = theme.id === 'POETIC_LIGHT';
        if (matRef.current) {
            const baseMultiplier = isLight ? 0.8 : 0.4;
            const activeMultiplier = baseMultiplier + (1.0 - baseMultiplier) * zoomFactor;

            if (isSatEdge) {
                const satZoomFactor = THREE.MathUtils.smoothstep(zoom, 6, maxSatZoom);
                matRef.current.opacity = satZoomFactor * (showSatellites ? 0.8 : 0.1);
            } else {
                matRef.current.opacity = (distance <= 0.5 && !showSatellites) ? 1.0 : currentOpacity * activeMultiplier;
            }

            // Lerp de la couleur vers la couleur principale (primary) quand on dézoome
            if (isSatEdge) {
                const c1 = new THREE.Color(theme.id === 'POETIC_LIGHT' ? '#f59e0b' : '#fbbf24');
                matRef.current.color.copy(c1);
            } else if (distance > 0.5) {
                const c1 = new THREE.Color(theme.colors.secondary.slice(0, 7));
                const c2 = new THREE.Color(theme.colors.primary.slice(0, 7));
                c1.lerp(c2, zoomFactor);
                matRef.current.color.copy(c1);
            }
        }
    });

    const isLight = theme.id === 'POETIC_LIGHT';
    const initialEdgeOpacity = isSatEdge 
        ? (showSatellites ? 0.8 : 0.1) 
        : ((distance <= 0.5 && !showSatellites) ? 1.0 : baseOpacity * (isLight ? 0.8 : 0.4));

    return (
        <mesh ref={meshRef} renderOrder={1}>
            <boxGeometry args={[0.04, 1, 0.04]} />
            <meshBasicMaterial
                ref={matRef}
                color={(isSatEdge ? (theme.id === 'POETIC_LIGHT' ? '#f59e0b' : '#fbbf24') : (distance <= 0.5 ? theme.colors.primary : theme.colors.secondary)).slice(0, 7)}
                transparent
                opacity={initialEdgeOpacity}
                depthWrite={false}
                blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
            />
        </mesh>
    );
});

// --- Helpers pour le positionnement de la caméra ---

/**
 * Calcule la direction de vue optimale (normale au plan de plus grand étalement)
 * via une approximation de PCA (Principal Component Analysis).
 */
function getBestViewDirection(neighbors: THREE.Vector3[]): THREE.Vector3 {
    if (neighbors.length < 2) return new THREE.Vector3(0, 0, 1);

    // 1. Matrice de covariance (relative au centre)
    let mxx = 0, mxy = 0, mxz = 0, myy = 0, myz = 0, mzz = 0;
    neighbors.forEach(v => {
        mxx += v.x * v.x; mxy += v.x * v.y; mxz += v.x * v.z;
        myy += v.y * v.y; myz += v.y * v.z; mzz += v.z * v.z;
    });

    const matrix = [
        [mxx, mxy, mxz],
        [mxy, myy, myz],
        [mxz, myz, mzz]
    ];

    // 2. Trouver le premier vecteur propre (direction de plus grand étalement) par itération
    const findLargestEv = (m: number[][]) => {
        let v = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
        for (let i = 0; i < 10; i++) {
            let nv = new THREE.Vector3(
                v.x * m[0][0] + v.y * m[0][1] + v.z * m[0][2],
                v.x * m[1][0] + v.y * m[1][1] + v.z * m[1][2],
                v.x * m[2][0] + v.y * m[2][1] + v.z * m[2][2]
            );
            if (nv.length() === 0) break;
            v = nv.normalize();
        }
        return v;
    };

    const v1 = findLargestEv(matrix);

    // 3. Déflation de la matrice pour trouver la 2ème direction principale
    const lambda1 = v1.x * (v1.x * mxx + v1.y * mxy + v1.z * mxz) +
        v1.y * (v1.x * mxy + v1.y * myy + v1.z * myz) +
        v1.z * (v1.x * mxz + v1.y * myz + v1.z * mzz);

    const m2 = [
        [matrix[0][0] - lambda1 * v1.x * v1.x, matrix[0][1] - lambda1 * v1.x * v1.y, matrix[0][2] - lambda1 * v1.x * v1.z],
        [matrix[1][0] - lambda1 * v1.y * v1.x, matrix[1][1] - lambda1 * v1.y * v1.y, matrix[1][2] - lambda1 * v1.y * v1.z],
        [matrix[2][0] - lambda1 * v1.z * v1.x, matrix[2][1] - lambda1 * v1.z * v1.y, matrix[2][2] - lambda1 * v1.z * v1.z]
    ];

    const v2 = findLargestEv(m2);

    // 4. La direction optimale est la normale au plan formé par v1 et v2
    // C'est l'axe selon lequel l'étalement est minimal, donc on voit le maximum d'étalement sur l'écran.
    let bestDir = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // Si v1 et v2 sont colinéaires (structure 1D), v2 sera nul. On fallback sur n'importe quel axe ortho.
    if (bestDir.length() < 0.1) {
        const arbitrary = Math.abs(v1.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        bestDir.crossVectors(v1, arbitrary).normalize();
    }

    return bestDir;
}

// --- Scène principale ---
const GraphScene = ({ 
    centerWord, 
    relatedWords, 
    onWordClick, 
    forceConnectTo, 
    parentsMap = {}, 
    isLoading, 
    theme,
    labelsOpaque = false,
    showSatellites = true,
    externalEdges,
    allNodesOnMap = [],
    satelliteBrandables = [],
    onGenerateConnexesClick,
    loadingConnexes,
    onGenerateSatellitesClick,
    loadingSatellites,
    selectedSatellite,
    setSelectedSatellite,
    onZoomChange
}: ConstellationProps & { theme: any; selectedSatellite: any; setSelectedSatellite: any }) => {
    const { camera } = useThree();
    const [nodes, setNodes] = useState<Map<string, NodeData>>(new Map());
    const [edges, setEdges] = useState<Map<string, EdgeData>>(new Map());
    const nodePositionsRef = useRef(new Map<string, THREE.Vector3>());
    const groupRef = useRef<THREE.Group>(null);
    const targetCameraPos = useRef(new THREE.Vector3(0, 0, 500));
    const isRotating = useRef(false);
    const lastZoomRef = useRef(camera.zoom);

    useEffect(() => {
        if (!allNodesOnMap || allNodesOnMap.length === 0) return;
        const lowerAllowed = new Set(allNodesOnMap.map(w => w.toLowerCase()));
        
        setNodes(prev => {
            const next = new Map(prev);
            let changed = false;
            for (const key of next.keys()) {
                if (!next.get(key)?.isSatellite && !lowerAllowed.has(key)) {
                    next.delete(key);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });

        setEdges(prev => {
            const next = new Map(prev);
            let changed = false;
            for (const [key, edge] of next.entries()) {
                const isSatEdge = edge.source.startsWith('sat-') || edge.target.startsWith('sat-');
                if (!isSatEdge && (!lowerAllowed.has(edge.source.toLowerCase()) || !lowerAllowed.has(edge.target.toLowerCase()))) {
                    next.delete(key);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [allNodesOnMap]);

    useEffect(() => {
        if (!externalEdges) return;
        setEdges(prev => {
            const next = new Map(prev);
            externalEdges.forEach(link => {
                const [a, b] = link.split('|');
                const id = [a, b].sort().join('-');
                if (!next.has(id)) {
                    next.set(id, { id, source: a, target: b, growFrom: a });
                }
            });
            return next;
        });
    }, [externalEdges]);

    useEffect(() => {
        const lowerCenter = centerWord.toLowerCase();
        let updatedNodes: Map<string, NodeData> = new Map();

        // 1. Mise à jour de la topologie (Nodes & Edges)
        setNodes(prevNodes => {
            const newNodes = new Map(prevNodes);

            // Nettoyer les anciens satellites qui ne sont pas rattachés au lowerCenter actuel
            let cleanedAny = false;
            for (const [key, node] of newNodes.entries()) {
                if (node.isSatellite && node.parentId !== lowerCenter) {
                    newNodes.delete(key);
                    cleanedAny = true;
                }
            }

            const shiftVisited = new Set<string>();
            const shiftBranch = (id: string, d: THREE.Vector3, targetParentId?: string) => {
                if (shiftVisited.has(id)) return;
                shiftVisited.add(id);
                const n = newNodes.get(id);
                if (!n) return;
                n.targetPos.add(d);
                n.startPos.add(d);
                if (targetParentId) n.parentId = targetParentId;
                Object.entries(parentsMap).forEach(([childId, pId]) => {
                    if (pId.toLowerCase() === id) shiftBranch(childId.toLowerCase(), d);
                });
            };

            if (!newNodes.has(lowerCenter)) {
                let startPos = new THREE.Vector3(0, 0, 0);
                let targetPos = new THREE.Vector3(0, 0, 0);
                let parentId: string | null = null;

                if (forceConnectTo) {
                    const parentNode = newNodes.get(forceConnectTo.toLowerCase());
                    if (parentNode) {
                        parentId = forceConnectTo.toLowerCase();
                        startPos.copy(parentNode.targetPos);
                        const radius = 8;
                        const phi = Math.acos(2 * Math.random() - 1);
                        const theta = Math.random() * Math.PI * 2;
                        targetPos.set(
                            parentNode.targetPos.x + radius * Math.sin(phi) * Math.cos(theta),
                            parentNode.targetPos.y + radius * Math.sin(phi) * Math.sin(theta),
                            parentNode.targetPos.z + radius * Math.cos(phi)
                        );
                    }
                } else if (newNodes.size > 0) {
                    const radius = 45;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const theta = Math.random() * Math.PI * 2;
                    targetPos.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
                    startPos.copy(targetPos).multiplyScalar(0.5);
                }

                newNodes.set(lowerCenter, { id: lowerCenter, label: centerWord, startPos, targetPos, parentId });
            } else if (forceConnectTo) {
                const node = newNodes.get(lowerCenter)!;
                const lowerParent = forceConnectTo.toLowerCase();
                if (node.parentId !== lowerParent) {
                    const parentNode = newNodes.get(lowerParent);
                    if (parentNode) {
                        const oldTarget = node.targetPos.clone();
                        const radius = 8;
                        const phi = Math.acos(2 * Math.random() - 1);
                        const theta = Math.random() * Math.PI * 2;
                        const newTarget = new THREE.Vector3(
                            parentNode.targetPos.x + radius * Math.sin(phi) * Math.cos(theta),
                            parentNode.targetPos.y + radius * Math.sin(phi) * Math.sin(theta),
                            parentNode.targetPos.z + radius * Math.cos(phi)
                        );
                        const delta = new THREE.Vector3().subVectors(newTarget, oldTarget);
                        shiftBranch(lowerCenter, delta, lowerParent);
                    }
                }
            }

            const activeNode = newNodes.get(lowerCenter)!;
            const existingPositions = Array.from(newNodes.values()).map(n => n.targetPos);

            const newWordsToPlace = relatedWords.filter(word => !newNodes.has(word.toLowerCase()));
            const totalToPlace = newWordsToPlace.length;

            newWordsToPlace.forEach((word, idx) => {
                const lowerWord = word.toLowerCase();
                const radius = 15 + Math.random() * 3;
                let bestPos = new THREE.Vector3();
                let maxScore = -Infinity;

                for (let i = 0; i < 24; i++) {
                    const phi = Math.acos(1 - 2 * (i + 0.5) / 24);
                    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

                    const candidateOffset = new THREE.Vector3(
                        radius * Math.sin(phi) * Math.cos(theta),
                        radius * Math.sin(phi) * Math.sin(theta),
                        radius * Math.cos(phi)
                    );

                    const candidatePos = activeNode.targetPos.clone().add(candidateOffset);
                    
                    let minDist = Infinity;
                    existingPositions.forEach(p => { 
                        minDist = Math.min(minDist, candidatePos.distanceTo(p)); 
                    });

                    const outwardBonus = candidatePos.length() * 0.45;
                    const score = minDist + outwardBonus;

                    if (score > maxScore) {
                        maxScore = score;
                        bestPos = candidatePos;
                    }
                }
                newNodes.set(lowerWord, { id: lowerWord, label: word, startPos: activeNode.targetPos.clone(), targetPos: bestPos, parentId: lowerCenter });
                existingPositions.push(bestPos);
            });

            // Placer les satellites brandables autour de l'activeNode de manière compacte et élégante
            (satelliteBrandables || []).forEach((sat, idx) => {
                const satId = `sat-${sat.name.toLowerCase()}`;
                if (!newNodes.has(satId)) {
                    const radius = 4.0 + Math.random() * 1.5; // distance beaucoup plus proche du centre (4.0 - 5.5)
                    const phi = Math.acos(2 * Math.random() - 1);
                    const theta = Math.random() * Math.PI * 2;
                    const candidateOffset = new THREE.Vector3(
                        radius * Math.sin(phi) * Math.cos(theta),
                        radius * Math.sin(phi) * Math.sin(theta),
                        radius * Math.cos(phi)
                    );
                    const bestPos = activeNode.targetPos.clone().add(candidateOffset);
                    newNodes.set(satId, {
                        id: satId,
                        label: sat.name,
                        startPos: activeNode.targetPos.clone(),
                        targetPos: bestPos,
                        parentId: lowerCenter,
                        isSatellite: true,
                        description: sat.desc
                    });
                }
            });

            // Relaxation 3D Force-Directed (Ressorts + Répulsion) pour garantir la cohérence
            const allNodesList = Array.from(newNodes.values());

            const activeConnections = new Set<string>();
            edges.forEach(edge => {
                const pair = [edge.source.toLowerCase(), edge.target.toLowerCase()].sort().join('|');
                activeConnections.add(pair);
            });
            relatedWords.forEach(w => {
                const pair = [lowerCenter, w.toLowerCase()].sort().join('|');
                activeConnections.add(pair);
            });
            if (forceConnectTo) {
                const pair = [lowerCenter, forceConnectTo.toLowerCase()].sort().join('|');
                activeConnections.add(pair);
            }
            allNodesList.forEach(n => {
                if (n.parentId && !n.isSatellite) {
                    const pair = [n.id, n.parentId.toLowerCase()].sort().join('|');
                    activeConnections.add(pair);
                }
            });

            // Ajouter les liaisons satellites
            (satelliteBrandables || []).forEach(sat => {
                const satId = `sat-${sat.name.toLowerCase()}`;
                const pair = [lowerCenter, satId].sort().join('|');
                activeConnections.add(pair);
            });

            for (let iter = 0; iter < 20; iter++) {
                const displacements = new Map<string, THREE.Vector3>();
                allNodesList.forEach(n => displacements.set(n.id, new THREE.Vector3()));

                // 1. Répulsion entre TOUS les nœuds pour éviter qu'ils soient trop proches (distance min)
                for (let i = 0; i < allNodesList.length; i++) {
                    for (let j = i + 1; j < allNodesList.length; j++) {
                        const n1 = allNodesList[i];
                        const n2 = allNodesList[j];
                        const delta = new THREE.Vector3().subVectors(n1.targetPos, n2.targetPos);
                        const dist = delta.length();
                        const isBothSats = n1.isSatellite && n2.isSatellite;
                        const minD = isBothSats ? 3.0 : MIN_DIST; // Répulsion plus douce entre satellites pour une constellation harmonieuse
                        if (dist < minD && dist > 0.01) {
                            const forceMag = (minD - dist) * 0.35;
                            const push = delta.clone().normalize().multiplyScalar(forceMag);
                            displacements.get(n1.id)!.add(push);
                            displacements.get(n2.id)!.sub(push);
                        }
                    }
                }

                // 2. Attraction le long de TOUTES les connexions actives
                activeConnections.forEach(linkStr => {
                    const [id1, id2] = linkStr.split('|');
                    const n1 = newNodes.get(id1);
                    const n2 = newNodes.get(id2);
                    if (n1 && n2) {
                        const delta = new THREE.Vector3().subVectors(n1.targetPos, n2.targetPos);
                        const dist = delta.length();
                        if (dist > 0.01) {
                            const isSatLink = n1.isSatellite || n2.isSatellite;
                            const targetD = isSatLink ? 5.0 : TARGET_DIST; // Attraction plus serrée pour les satellites
                            const forceMag = (dist - targetD) * (isSatLink ? 0.35 : 0.22);
                            const pull = delta.clone().normalize().multiplyScalar(forceMag);
                            displacements.get(n1.id)!.sub(pull);
                            displacements.get(n2.id)!.add(pull);
                        }
                    }
                });

                // 3. Application des déplacements (le centre reste ancré pour la stabilité)
                allNodesList.forEach(n => {
                    if (n.id === lowerCenter) return;
                    const disp = displacements.get(n.id)!;
                    const maxDisp = 2.0;
                    if (disp.length() > maxDisp) disp.normalize().multiplyScalar(maxDisp);
                    n.targetPos.add(disp);
                });
            }

            // BFS Distances using predicted full adjacency list
            newNodes.forEach(n => { n.distance = n.isSatellite ? 2 : 99; });
            const adj = new Map<string, string[]>();
            
            edges.forEach(edge => {
                const s = edge.source; const t = edge.target;
                if (!adj.has(s)) adj.set(s, []); if (!adj.has(t)) adj.set(t, []);
                adj.get(s)!.push(t); adj.get(t)!.push(s);
            });
            
            if (forceConnectTo) {
                const s = lowerCenter; const t = forceConnectTo.toLowerCase();
                if (!adj.has(s)) adj.set(s, []); if (!adj.has(t)) adj.set(t, []);
                adj.get(s)!.push(t); adj.get(t)!.push(s);
            }
            
            relatedWords.forEach(w => {
                const s = lowerCenter; const t = w.toLowerCase();
                if (!adj.has(s)) adj.set(s, []); if (!adj.has(t)) adj.set(t, []);
                adj.get(s)!.push(t); adj.get(t)!.push(s);
            });

            const queue: [string, number][] = [[lowerCenter, 0]];
            const visited = new Set<string>([lowerCenter]);
            while (queue.length > 0) {
                const [curr, d] = queue.shift()!;
                const n = newNodes.get(curr);
                if (n && !n.isSatellite) n.distance = d;
                (adj.get(curr) || []).forEach(nb => {
                    if (!visited.has(nb)) { visited.add(nb); queue.push([nb, d + 1]); }
                });
            }

            updatedNodes = newNodes;
            return newNodes;
        });

        setEdges(prev => {
            const next = new Map(prev);
            // Nettoyer les anciens liens satellites qui ne sont pas rattachés au lowerCenter actuel
            for (const [key, edge] of next.entries()) {
                const isSat = edge.source.startsWith('sat-') || edge.target.startsWith('sat-');
                if (isSat && edge.source !== lowerCenter && edge.target !== lowerCenter) {
                    next.delete(key);
                }
            }

            if (forceConnectTo) {
                const lp = forceConnectTo.toLowerCase();
                const id = [lowerCenter, lp].sort().join('-');
                if (!next.has(id)) next.set(id, { id, source: lp, target: lowerCenter, growFrom: lowerCenter });
            }
            relatedWords.forEach(w => {
                const lw = w.toLowerCase();
                const id = [lowerCenter, lw].sort().join('-');
                if (!next.has(id)) next.set(id, { id, source: lowerCenter, target: lw, growFrom: lowerCenter });
            });
            // Ajouter les liens satellites
            (satelliteBrandables || []).forEach(sat => {
                const satId = `sat-${sat.name.toLowerCase()}`;
                const id = [lowerCenter, satId].sort().join('-');
                if (!next.has(id)) next.set(id, { id, source: lowerCenter, target: satId, growFrom: lowerCenter });
            });
            return next;
        });

        // 2. Calcul de la position optimale de la caméra (PCA)
        const centerNode = updatedNodes.get(lowerCenter);
        if (centerNode) {
            const neighbors: THREE.Vector3[] = [];
            updatedNodes.forEach(n => {
                if (!n.isSatellite && (n.parentId === lowerCenter || centerNode.parentId === n.id)) {
                    neighbors.push(new THREE.Vector3().subVectors(n.targetPos, centerNode.targetPos));
                }
            });
            if (neighbors.length >= 2) {
                const bestDir = getBestViewDirection(neighbors);
                const currentDir = camera.position.clone().normalize();
                if (bestDir.dot(currentDir) < 0) bestDir.multiplyScalar(-1);
                if (Math.abs(bestDir.y) > 0.95) bestDir.add(new THREE.Vector3(0.1, 0, 0)).normalize();
                targetCameraPos.current.copy(bestDir.multiplyScalar(500));
                isRotating.current = true;
            }
        }
    }, [centerWord, relatedWords, forceConnectTo, parentsMap, camera, satelliteBrandables]);

    const targetGroupOffset = useMemo(() => {
        const n = nodes.get(centerWord.toLowerCase());
        return n ? n.targetPos.clone().multiplyScalar(-1) : new THREE.Vector3();
    }, [centerWord, nodes]);

    useFrame(() => {
        // --- RELAXATION CONTINUE DU RÉSEAU (TEMPS RÉEL) ---
        const lowerCenter = centerWord.toLowerCase();
        const allNodesList = Array.from(nodes.values());
        if (allNodesList.length > 1) {
            const displacements = new Map<string, THREE.Vector3>();
            allNodesList.forEach(n => displacements.set(n.id, new THREE.Vector3()));

            // 1. Répulsion temps réel entre tous les nœuds
            for (let i = 0; i < allNodesList.length; i++) {
                for (let j = i + 1; j < allNodesList.length; j++) {
                    const n1 = allNodesList[i];
                    const n2 = allNodesList[j];
                    const delta = new THREE.Vector3().subVectors(n1.targetPos, n2.targetPos);
                    const dist = delta.length();
                    const isBothSats = n1.isSatellite && n2.isSatellite;
                    const minD = isBothSats ? 3.0 : MIN_DIST;
                    if (dist < minD && dist > 0.01) {
                        const forceMag = (minD - dist) * 0.04; // force modérée pour une transition lisse
                        const push = delta.clone().normalize().multiplyScalar(forceMag);
                        displacements.get(n1.id)!.add(push);
                        displacements.get(n2.id)!.sub(push);
                    }
                }
            }

            // 2. Attraction temps réel le long de tous les liens actifs
            edges.forEach(edge => {
                const n1 = nodes.get(edge.source);
                const n2 = nodes.get(edge.target);
                if (n1 && n2) {
                    const delta = new THREE.Vector3().subVectors(n1.targetPos, n2.targetPos);
                    const dist = delta.length();
                    if (dist > 0.01) {
                        const isSatLink = n1.isSatellite || n2.isSatellite;
                        const targetD = isSatLink ? 5.0 : TARGET_DIST;
                        const forceMag = (dist - targetD) * (isSatLink ? 0.06 : 0.035); // attraction modérée
                        const pull = delta.clone().normalize().multiplyScalar(forceMag);
                        displacements.get(n1.id)!.sub(pull);
                        displacements.get(n2.id)!.add(pull);
                    }
                }
            });

            // 3. Application fluide des déplacements (le centre reste fixe)
            allNodesList.forEach(n => {
                if (n.id === lowerCenter) return;
                const disp = displacements.get(n.id)!;
                const maxDisp = 0.4; // cap pour éviter des sauts brutaux
                if (disp.length() > maxDisp) disp.normalize().multiplyScalar(maxDisp);
                n.targetPos.add(disp);
            });
        }

        // Translation du groupe fluide et amortie pour centrer le concept actif
        if (groupRef.current) groupRef.current.position.lerp(targetGroupOffset, 0.05);

        // Rotation et déplacement fluide de la caméra vers l'angle de vue optimal
        if (isRotating.current) {
            camera.position.lerp(targetCameraPos.current, 0.045);
            camera.lookAt(0, 0, 0);

            // Seuil de proximité pour clore la phase d'auto-rotation
            if (camera.position.distanceTo(targetCameraPos.current) < 0.2) {
                isRotating.current = false;
            }
        }
        // --- DÉTECTION ET TRANSMISSION DU ZOOM ---
        const zoom = (camera as THREE.OrthographicCamera).zoom;
        if (Math.abs(zoom - lastZoomRef.current) > 0.05) {
            lastZoomRef.current = zoom;
            if (onZoomChange) {
                onZoomChange(zoom);
            }
        }
    });

    return (
        <>
            {/* Caméra avec amorti (damping) activé pour des rotations manuelles fluides et organiques */}
            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableDamping={true}
                dampingFactor={0.06}
                minZoom={6}
                maxZoom={120}
            />
            <ambientLight intensity={0.3} />

            <group ref={groupRef}>
                {Array.from(edges.values()).map(edge => {
                    const sn = nodes.get(edge.source);
                    const tn = nodes.get(edge.target);
                    const isDirect = sn && tn ? (sn.distance === 0 || tn.distance === 0) : false;
                    const edgeDist = isDirect ? 0.5 : (sn && tn ? Math.max(sn.distance!, tn.distance!) : 2);
                    return (
                        <Edge
                            key={edge.id}
                            sourceId={edge.source}
                            targetId={edge.target}
                            growFromId={edge.growFrom}
                            nodePositionsRef={nodePositionsRef}
                            distance={edgeDist}
                            theme={theme}
                            showSatellites={showSatellites}
                        />
                    );
                })}

                {Array.from(nodes.values()).map(node => (
                    <Node
                        key={node.id}
                        data={node}
                        isActive={node.id === centerWord.toLowerCase()}
                        nodePositionsRef={nodePositionsRef}
                        onClick={onWordClick}
                        distance={node.distance}
                        isLoading={isLoading}
                        theme={theme}
                        labelsOpaque={labelsOpaque}
                        showSatellites={showSatellites}
                        onGenerateConnexesClick={onGenerateConnexesClick}
                        loadingConnexes={loadingConnexes}
                        onGenerateSatellitesClick={onGenerateSatellitesClick}
                        loadingSatellites={loadingSatellites}
                        isSelectedSatellite={selectedSatellite?.name === node.label}
                        setSelectedSatellite={setSelectedSatellite}
                    />
                ))}
            </group>
        </>
    );
};

// --- Export ---
export default function Constellation3DV2(props: ConstellationProps) {
    const theme = THEMES[props.activeTheme] || THEMES.AMBER;
    const [selectedSatellite, setSelectedSatellite] = useState<{name: string, desc: string} | null>(null);

    // Close description if satellites are hidden or center word changes
    useEffect(() => {
        if (!props.showSatellites) {
            setSelectedSatellite(null);
        }
    }, [props.showSatellites]);

    useEffect(() => {
        setSelectedSatellite(null);
    }, [props.centerWord]);

    const { defaultZoom } = getDynamicZoomSettings();

    return (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden" style={{ backgroundColor: 'var(--theme-bg)', touchAction: 'none' }}>
            <Canvas
                orthographic
                camera={{ zoom: defaultZoom, position: [0, 0, 500], near: 1, far: 2000 }}
                dpr={typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4 ? [1, 1.5] : [1, 3]}
                gl={{
                    antialias: true,
                    powerPreference: "high-performance",
                    alpha: true
                }}
            >
                <GraphScene 
                    {...props} 
                    theme={theme} 
                    selectedSatellite={selectedSatellite} 
                    setSelectedSatellite={setSelectedSatellite} 
                />
            </Canvas>

            {/* Premium UI for Satellite Description */}
            <AnimatePresence>
                {selectedSatellite && props.showSatellites && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute bottom-[calc(8rem+env(safe-area-inset-bottom))] left-4 right-4 sm:left-auto sm:right-8 z-40 sm:w-full sm:max-w-sm pointer-events-none"
                    >
                        <div 
                            className="p-6 backdrop-blur-xl rounded-none"
                            style={{ 
                                backgroundColor: theme.id === 'POETIC_LIGHT' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(10, 10, 10, 0.65)',
                                borderColor: 'var(--theme-primary)',
                                boxShadow: theme.id === 'POETIC_LIGHT' 
                                    ? '0 20px 40px rgba(0, 0, 0, 0.05), 0 0 20px rgba(245, 166, 35, 0.1)' 
                                    : '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 166, 35, 0.15)',
                                borderLeftWidth: '2px',
                                borderTopWidth: '1px',
                                borderBottomWidth: '1px',
                                borderRightWidth: '1px'
                            }}
                        >
                            <h3 
                                style={{ 
                                    fontFamily: 'var(--app-font-display)',
                                    fontStyle: 'italic',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: theme.id === 'POETIC_LIGHT' ? '#d97706' : '#fbbf24',
                                    marginBottom: '10px',
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {selectedSatellite.name}
                            </h3>
                            <p 
                                style={{
                                    fontFamily: 'var(--app-font-display)',
                                    fontWeight: 300,
                                    fontStyle: 'italic',
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    color: theme.id === 'POETIC_LIGHT' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.75)',
                                    letterSpacing: '0.03em'
                                }}
                            >
                                {selectedSatellite.desc}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Technical Overlays */}
            <div className="point-grid" />
            <div className="grain-overlay" />

            <div className="crosshair-marker crosshair-tl" />
            <div className="crosshair-marker crosshair-tr" />
            <div className="crosshair-marker crosshair-bl" />
            <div className="crosshair-marker crosshair-br" />
        </div>
    );
}