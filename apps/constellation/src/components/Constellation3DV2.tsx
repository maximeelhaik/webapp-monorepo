import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { ACTIVE_THEME, THEMES } from '../theme';

// --- TYPES ---
export interface NodeData {
    id: string;
    label: string;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    parentId?: string | null; // Pour savoir si on doit repositionner
    distance?: number;
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
}

// --- Constantes visuelles ---
const ACTIVE_RADIUS = 0.85;
const NODE_RADIUS = 0.4;
const HIT_RADIUS_ACTIVE = 2.2;
const HIT_RADIUS_NODE = 1.4;
const TARGET_DIST = 14;
const MIN_DIST = 9.0;



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
}: {
    data: NodeData;
    isActive: boolean;
    nodePositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
    onClick: (id: string) => void;
    distance?: number;
    isLoading?: boolean;
    theme: any;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const currentPos = useRef(new THREE.Vector3().copy(data.startPos));
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        nodePositionsRef.current.set(data.id, currentPos.current);
    }, [data.id, nodePositionsRef]);

    const circleMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const cross1MatRef = useRef<THREE.MeshBasicMaterial>(null);
    const cross2MatRef = useRef<THREE.MeshBasicMaterial>(null);
    const labelRef = useRef<HTMLSpanElement>(null);

    // Opacité de base liée à la distance (ajustée pour être plus intense, et renforcée en mode clair pour la lisibilité)
    const isLight = theme.id === 'POETIC_LIGHT';
    const baseOpacity = distance <= 1 
        ? 1.0 
        : isLight 
            ? Math.max(0.40, 0.85 / Math.pow(distance, 1.2)) 
            : Math.max(0.01, 0.6 / Math.pow(distance, 1.5));

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
        // zoomFactor: 1 quand on est dézoomé au max (6), 0 quand on est au zoom par défaut (25)
        const zoomFactor = 1 - THREE.MathUtils.smoothstep(zoom, 6, 25);
        const currentOpacity = baseOpacity + (1.0 - baseOpacity) * zoomFactor;

        // Mise à jour directe des matériaux pour la performance
        if (circleMatRef.current) circleMatRef.current.opacity = currentOpacity;
        if (glowMatRef.current) {
            const glowBase = isActive ? 0.18 : (hovered ? 0.08 : 0.03);
            glowMatRef.current.opacity = glowBase * currentOpacity;
        }
        if (ringMatRef.current) ringMatRef.current.opacity = 0.5 * currentOpacity;
        if (cross1MatRef.current) cross1MatRef.current.opacity = 0.3 * currentOpacity;
        if (cross2MatRef.current) cross2MatRef.current.opacity = 0.3 * currentOpacity;

        // Mise à jour du label HTML (couleur et opacité)
        if (labelRef.current) {
            labelRef.current.style.color = isActive ? theme.colors.primary : theme.colors.text;
            labelRef.current.style.opacity = `${currentOpacity}`;
        }
    });

    const nodeR = isActive ? ACTIVE_RADIUS : NODE_RADIUS;
    const hitR = isActive ? HIT_RADIUS_ACTIVE : HIT_RADIUS_NODE;
    const glowR = nodeR * 2.4;

    const opacity = distance <= 1 ? 1 : Math.max(0.05, 0.7 / Math.pow(distance, 1.5));
    const formattedLabel = data.label.charAt(0).toUpperCase() + data.label.slice(1).toLowerCase();

    return (
        <group ref={groupRef}>
            <mesh
                onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
                onClick={(e) => { e.stopPropagation(); onClick(data.id); }}
            >
                <circleGeometry args={[hitR, 32]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>

            <mesh raycast={() => null} renderOrder={9}>
                <circleGeometry args={[glowR, 32]} />
                <meshBasicMaterial
                    ref={glowMatRef}
                    color={isActive ? theme.colors.primary : '#ffffff'}
                    transparent
                    opacity={(isActive ? 0.18 : (hovered ? 0.08 : 0.03)) * baseOpacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh raycast={() => null} renderOrder={10}>
                <circleGeometry args={[nodeR, 4]} />
                <meshBasicMaterial
                    ref={circleMatRef}
                    color={isActive ? theme.colors.primary : (hovered ? '#ffffff' : theme.colors.secondary)}
                    transparent
                    opacity={baseOpacity}
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
                        color={theme.colors.primary}
                        transparent
                        opacity={0.5 * baseOpacity}
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
                        <meshBasicMaterial ref={cross1MatRef} color="#ffffff" transparent opacity={0.3 * baseOpacity} depthWrite={false} />
                    </mesh>
                    <mesh raycast={() => null} rotation={[0, 0, Math.PI / 2]}>
                        <boxGeometry args={[nodeR * 3, 0.01, 0.01]} />
                        <meshBasicMaterial ref={cross2MatRef} color="#ffffff" transparent opacity={0.3 * baseOpacity} depthWrite={false} />
                    </mesh>
                </group>
            )}

            <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <span
                    ref={labelRef}
                    style={{
                        display: 'block',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        color: isActive ? theme.colors.primary : theme.colors.text,
                        fontSize: distance === 0 ? '25px' : (distance === 1 ? '18px' : '18px'),
                        fontWeight: distance === 0 ? 500 : (distance === 1 ? 300 : 200),
                        fontFamily: theme.typography.display,
                        fontStyle: 'italic',
                        letterSpacing: distance <= 1 ? '0.15em' : '0.05em',
                        textTransform: 'none',
                        textShadow: isActive
                            ? '0 0 20px rgba(245,166,35,0.6)'
                            : distance <= 1
                                ? '0 0 15px rgba(255,255,255,0.2)'
                                : 'none',
                        transform: `translate3d(0, ${distance === 0 ? 55 : (distance === 1 ? 35 : 22)}px, 0)`,
                        whiteSpace: 'nowrap',
                        opacity: isActive ? 1.0 : baseOpacity,
                        transition: 'all 0.3s ease-out'
                    }}
                >
                    {formattedLabel}
                </span>
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
}: {
    sourceId: string;
    targetId: string;
    nodePositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
    growFromId: string;
    distance?: number;
    theme: any;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    const progress = useRef(0);

    const baseOpacity = distance === 0.5 ? 1.0 : Math.max(0.01, 0.6 / Math.pow(distance, 1.5));

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
        // zoomFactor: 1 quand on est dézoomé au max (6), 0 quand on est au zoom par défaut (25)
        const zoomFactor = 1 - THREE.MathUtils.smoothstep(zoom, 6, 25);
        const currentOpacity = baseOpacity + (1.0 - baseOpacity) * zoomFactor;

        const isLight = theme.id === 'POETIC_LIGHT';
        if (matRef.current) {
            const baseMultiplier = isLight ? 0.8 : 0.4;
            const activeMultiplier = baseMultiplier + (1.0 - baseMultiplier) * zoomFactor;
            matRef.current.opacity = distance <= 0.5 ? 1.0 : currentOpacity * activeMultiplier;
        }
    });

    const isLight = theme.id === 'POETIC_LIGHT';
    return (
        <mesh ref={meshRef} renderOrder={1}>
            <boxGeometry args={[0.04, 1, 0.04]} />
            <meshBasicMaterial
                ref={matRef}
                color={distance <= 0.5 ? theme.colors.primary : theme.colors.secondary}
                transparent
                opacity={distance <= 0.5 ? 1.0 : baseOpacity * (isLight ? 0.8 : 0.4)}
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
const GraphScene = ({ centerWord, relatedWords, onWordClick, forceConnectTo, parentsMap = {}, isLoading, theme }: ConstellationProps & { theme: any }) => {
    const { camera } = useThree();
    const [nodes, setNodes] = useState<Map<string, NodeData>>(new Map());
    const [edges, setEdges] = useState<Map<string, EdgeData>>(new Map());
    const nodePositionsRef = useRef(new Map<string, THREE.Vector3>());
    const groupRef = useRef<THREE.Group>(null);
    const targetCameraPos = useRef(new THREE.Vector3(0, 0, 500));
    const isRotating = useRef(false);

    useEffect(() => {
        const lowerCenter = centerWord.toLowerCase();
        let updatedNodes: Map<string, NodeData> = new Map();

        // 1. Mise à jour de la topologie (Nodes & Edges)
        setNodes(prevNodes => {
            const newNodes = new Map(prevNodes);

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
                const radius = 13 + Math.random() * 3;
                let bestPos = new THREE.Vector3();
                let maxScore = -Infinity;

                // 24 candidates on a 3D sphere (using Fibonacci distribution) to find the most expansive, non-overlapping position
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

                    // Maximize minimum distance to prevent overlap AND favor directions pointing outward from the origin (0,0,0)
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

            // Relaxation 3D Force-Directed (Ressorts + Répulsion) pour garantir la cohérence
            const allNodesList = Array.from(newNodes.values());

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
                        if (dist < MIN_DIST && dist > 0.01) {
                            const forceMag = (MIN_DIST - dist) * 0.35;
                            const push = delta.clone().normalize().multiplyScalar(forceMag);
                            displacements.get(n1.id)!.add(push);
                            displacements.get(n2.id)!.sub(push);
                        }
                    }
                }

                // 2. Attraction le long des liens directs pour éviter qu'ils soient trop loin (distance max)
                allNodesList.forEach(n => {
                    if (n.parentId) {
                        const p = newNodes.get(n.parentId);
                        if (p) {
                            const delta = new THREE.Vector3().subVectors(n.targetPos, p.targetPos);
                            const dist = delta.length();
                            if (dist > 0.01) {
                                const forceMag = (dist - TARGET_DIST) * 0.22;
                                const pull = delta.clone().normalize().multiplyScalar(forceMag);
                                displacements.get(n.id)!.sub(pull);
                                displacements.get(p.id)!.add(pull);
                            }
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
            newNodes.forEach(n => { n.distance = 99; });
            const adj = new Map<string, string[]>();
            
            // 1. Existing edges from state
            edges.forEach(edge => {
                const s = edge.source; const t = edge.target;
                if (!adj.has(s)) adj.set(s, []); if (!adj.has(t)) adj.set(t, []);
                adj.get(s)!.push(t); adj.get(t)!.push(s);
            });
            
            // 2. Magic connection (forceConnectTo)
            if (forceConnectTo) {
                const s = lowerCenter; const t = forceConnectTo.toLowerCase();
                if (!adj.has(s)) adj.set(s, []); if (!adj.has(t)) adj.set(t, []);
                adj.get(s)!.push(t); adj.get(t)!.push(s);
            }
            
            // 3. New related words connections
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
                if (n) n.distance = d;
                (adj.get(curr) || []).forEach(nb => {
                    if (!visited.has(nb)) { visited.add(nb); queue.push([nb, d + 1]); }
                });
            }

            updatedNodes = newNodes;
            return newNodes;
        });

        setEdges(prev => {
            const next = new Map(prev);
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
            return next;
        });

        // 2. Calcul de la position optimale de la caméra (PCA)
        const centerNode = updatedNodes.get(lowerCenter);
        if (centerNode) {
            const neighbors: THREE.Vector3[] = [];
            updatedNodes.forEach(n => {
                if (n.parentId === lowerCenter || centerNode.parentId === n.id) {
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
    }, [centerWord, relatedWords, forceConnectTo, parentsMap, camera]);

    const targetGroupOffset = useMemo(() => {
        const n = nodes.get(centerWord.toLowerCase());
        return n ? n.targetPos.clone().multiplyScalar(-1) : new THREE.Vector3();
    }, [centerWord, nodes]);

    useFrame(() => {
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
    });

    return (
        <>
            {/* Caméra avec amorti (damping) activé pour des rotations manuelles fluides et organiques */}
            <OrbitControls
                enablePan={false}
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
                    />
                ))}
            </group>
        </>
    );
};

// --- Export ---
export default function Constellation3DV2(props: ConstellationProps) {
    const theme = THEMES[props.activeTheme] || THEMES.AMBER;
    return (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <Canvas
                orthographic
                camera={{ zoom: 25, position: [0, 0, 500], near: 1, far: 2000 }}
                dpr={[1, 3]}
                gl={{
                    antialias: true,
                    powerPreference: "high-performance",
                    alpha: true
                }}
            >
                <GraphScene {...props} theme={theme} />
            </Canvas>

            {/* Technical Overlays */}
            <div className="point-grid" />
            <div className="grain-overlay" />

            <div className="crosshair-marker crosshair-tl" />
            <div className="crosshair-marker crosshair-tr" />
            <div className="crosshair-marker crosshair-bl" />
            <div className="crosshair-marker crosshair-br" />

            {/* Precision Coordinates Overlay — removed (moved to App.tsx footer) */}
        </div>
    );
}