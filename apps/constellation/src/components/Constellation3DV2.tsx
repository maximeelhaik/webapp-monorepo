import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

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
}

// --- Constantes visuelles ---
const ACTIVE_RADIUS = 1.1;   // rayon du cercle central
const NODE_RADIUS   = 0.4;   // rayon des cercles satellites
const HIT_RADIUS_ACTIVE = 2.8; // zone de clic du noeud central
const HIT_RADIUS_NODE   = 1.4; // zone de clic des noeuds satellites

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
}: {
    data: NodeData;
    isActive: boolean;
    nodePositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
    onClick: (id: string) => void;
    distance?: number;
    isLoading?: boolean;
}) => {
    const groupRef  = useRef<THREE.Group>(null);
    const currentPos = useRef(new THREE.Vector3().copy(data.startPos));
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        nodePositionsRef.current.set(data.id, currentPos.current);
    }, [data.id, nodePositionsRef]);

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
    });

    const nodeR  = isActive ? ACTIVE_RADIUS : NODE_RADIUS;
    const hitR   = isActive ? HIT_RADIUS_ACTIVE : HIT_RADIUS_NODE;
    const glowR  = nodeR * 2.4;

    const opacity = distance <= 1 ? 1 : Math.max(0.05, 1 / Math.pow(distance, 1.35));
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

            <mesh raycast={() => null}>
                <circleGeometry args={[glowR, 32]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={(isActive ? 0.15 : (hovered ? 0.08 : 0.03)) * opacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh raycast={() => null}>
                <circleGeometry args={[nodeR, 4]} />
                <meshBasicMaterial
                    color={isActive ? '#ffffff' : (hovered ? '#ffffff' : '#f2f2f2')}
                    transparent
                    opacity={opacity}
                    side={THREE.DoubleSide}
                />
            </mesh>
            
            {/* Precision Crosshair on Node */}
            {(isActive || hovered) && (
                <group rotation={[0, 0, Math.PI / 4]}>
                    <mesh raycast={() => null}>
                        <boxGeometry args={[nodeR * 3, 0.01, 0.01]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.3 * opacity} />
                    </mesh>
                    <mesh raycast={() => null} rotation={[0, 0, Math.PI / 2]}>
                        <boxGeometry args={[nodeR * 3, 0.01, 0.01]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.3 * opacity} />
                    </mesh>
                </group>
            )}

            <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <span
                    style={{
                        display: 'block',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        color: isActive ? '#f2f2f2' : 'rgba(242, 242, 242, 0.7)',
                        fontSize: isActive ? '32px' : '15px',
                        fontWeight: isActive ? 600 : 400,
                        fontFamily: "'Space Grotesk', sans-serif",
                        letterSpacing: isActive ? '0.05em' : '0.1em',
                        textTransform: 'uppercase',
                        textShadow: isActive ? '0 0 15px rgba(255,255,255,0.3)' : 'none',
                        transform: `translate3d(0, ${isActive ? 55 : 28}px, 0)`,
                        whiteSpace: 'nowrap',
                        opacity,
                        transition: 'all 0.4s cubic-bezier(0.2, 0, 0, 1)',
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
}: {
    sourceId: string;
    targetId: string;
    nodePositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
    growFromId: string;
    distance?: number;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    const progress = useRef(0);

    useFrame((_, delta) => {
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
    });

    const edgeOpacity = (distance <= 1 ? 1 : Math.max(0.05, 1 / Math.pow(distance, 1.35))) * 0.4;

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[0.06, 1, 0.06]} />
            <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={edgeOpacity}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
});

// --- Scène principale ---
const GraphScene = ({ centerWord, relatedWords, onWordClick, forceConnectTo, parentsMap = {}, isLoading }: ConstellationProps) => {
    const [nodes, setNodes] = useState<Map<string, NodeData>>(new Map());
    const [edges, setEdges] = useState<Map<string, EdgeData>>(new Map());
    const nodePositionsRef = useRef(new Map<string, THREE.Vector3>());
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        const lowerCenter = centerWord.toLowerCase();

        setNodes(prevNodes => {
            const newNodes = new Map(prevNodes);

            // Helper de repositionnement récursif
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
                    targetPos.set(
                        radius * Math.sin(phi) * Math.cos(theta),
                        radius * Math.sin(phi) * Math.sin(theta),
                        radius * Math.cos(phi)
                    );
                    startPos.copy(targetPos).multiplyScalar(0.5);
                }

                newNodes.set(lowerCenter, {
                    id: lowerCenter, label: centerWord,
                    startPos, targetPos, parentId
                });
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
            const pushVector = activeNode.targetPos.length() > 0
                ? activeNode.targetPos.clone().normalize()
                : new THREE.Vector3(0, 1, 0);

            relatedWords.forEach(word => {
                const lowerWord = word.toLowerCase();
                if (!newNodes.has(lowerWord)) {
                    const radius = 10 + Math.random() * 4;
                    let bestPos = new THREE.Vector3();
                    let maxMinDist = -1;
                    let attempts = 0;
                    for (let i = 0; i < 8; i++) {
                        attempts++;
                        if (attempts > 100) break;

                        const phi   = Math.acos(2 * Math.random() - 1);
                        const theta = Math.random() * Math.PI * 2;
                        const candidateOffset = new THREE.Vector3(
                            radius * Math.sin(phi) * Math.cos(theta),
                            radius * Math.sin(phi) * Math.sin(theta),
                            radius * Math.cos(phi),
                        );
                        if (candidateOffset.dot(pushVector) < -0.2 && activeNode.targetPos.length() > 5) {
                            i--; continue;
                        }
                        const candidatePos = activeNode.targetPos.clone().add(candidateOffset);
                        let minDist = Infinity;
                        existingPositions.forEach(p => { minDist = Math.min(minDist, candidatePos.distanceTo(p)); });
                        if (minDist > maxMinDist) { maxMinDist = minDist; bestPos = candidatePos; }
                    }

                    newNodes.set(lowerWord, {
                        id: lowerWord, label: word,
                        startPos: activeNode.targetPos.clone(),
                        targetPos: bestPos,
                        parentId: lowerCenter
                    });
                    existingPositions.push(bestPos);
                } else if (lowerWord !== lowerCenter && lowerWord !== 'cosmos') {
                    // Resserrage : Le mot existe déjà mais est renvoyé comme lié au centre actuel
                    const node = newNodes.get(lowerWord)!;
                    if (node.parentId !== lowerCenter) {
                        const oldTarget = node.targetPos.clone();
                        const radius = 12; // Un peu plus d'espace pour les enfants que pour les ponts
                        const phi = Math.acos(2 * Math.random() - 1);
                        const theta = Math.random() * Math.PI * 2;
                        const newTarget = new THREE.Vector3(
                            activeNode.targetPos.x + radius * Math.sin(phi) * Math.cos(theta),
                            activeNode.targetPos.y + radius * Math.sin(phi) * Math.sin(theta),
                            activeNode.targetPos.z + radius * Math.cos(phi)
                        );
                        const delta = new THREE.Vector3().subVectors(newTarget, oldTarget);
                        shiftBranch(lowerWord, delta, lowerCenter);
                    }
                }
            });

            // --- ÉTAPE DE RELAXATION GÉNÉRALE (Constraint Satisfaction) ---
            // On s'assure que les liens sont de taille homogène et que les nœuds ne se chevauchent pas.
            const allNodesList = Array.from(newNodes.values());
            const TARGET_DIST = 14; // Taille idéale d'un lien
            const MIN_NODE_DIST = 10; // Distance minimale entre deux nœuds quelconques

            for (let iter = 0; iter < 10; iter++) {
                // 1. Équilibrage des Liens (Attraction/Répulsion sur les arrêtes)
                const tempEdges: [string, string][] = [];
                edges.forEach(e => tempEdges.push([e.source, e.target]));
                relatedWords.forEach(w => tempEdges.push([lowerCenter, w.toLowerCase()]));
                if (forceConnectTo) tempEdges.push([forceConnectTo.toLowerCase(), lowerCenter]);

                tempEdges.forEach(([sId, tId]) => {
                    const s = newNodes.get(sId);
                    const t = newNodes.get(tId);
                    if (!s || !t) return;
                    const dist = s.targetPos.distanceTo(t.targetPos);
                    
                    // Si l'écart à la distance idéale est trop grand, on ajuste
                    if (Math.abs(dist - TARGET_DIST) > 1) {
                        const dir = new THREE.Vector3().subVectors(s.targetPos, t.targetPos).normalize();
                        if (dir.length() === 0) dir.set(Math.random(), Math.random(), Math.random()).normalize();
                        
                        const factor = (dist - TARGET_DIST) * 0.2;
                        const move = dir.clone().multiplyScalar(factor);
                        
                        // Le fils bouge plus que le parent pour garder une hiérarchie stable
                        t.targetPos.add(move);
                        s.targetPos.sub(move.multiplyScalar(0.1));
                    }
                });

                // 2. Répulsion Globale : On évite les collisions entre nœuds non-liés
                for (let i = 0; i < allNodesList.length; i++) {
                    const n1 = allNodesList[i];
                    for (let j = i + 1; j < allNodesList.length; j++) {
                        const n2 = allNodesList[j];
                        const dist = n1.targetPos.distanceTo(n2.targetPos);
                        if (dist < MIN_NODE_DIST) {
                            const dir = new THREE.Vector3().subVectors(n1.targetPos, n2.targetPos).normalize();
                            if (dir.length() === 0) dir.set(Math.random(), Math.random(), Math.random()).normalize();
                            const pushFactor = (MIN_NODE_DIST - dist) * 0.4;
                            const push = dir.multiplyScalar(pushFactor);
                            n1.targetPos.add(push);
                            n2.targetPos.sub(push);
                        }
                    }
                }
            }

            // BFS distances
            newNodes.forEach(n => { n.distance = 99; });
            const allEdges: [string, string][] = [];
            
            // On utilise les liens actuels + le nouveau lien forcé + les nouveaux liens de streaming
            edges.forEach(e => allEdges.push([e.source, e.target]));
            if (forceConnectTo) allEdges.push([forceConnectTo.toLowerCase(), lowerCenter]);
            relatedWords.forEach(w => allEdges.push([lowerCenter, w.toLowerCase()]));

            const adj = new Map<string, string[]>();
            allEdges.forEach(([s, t]) => {
                if (!adj.has(s)) adj.set(s, []);
                if (!adj.has(t)) adj.set(t, []);
                adj.get(s)!.push(t);
                adj.get(t)!.push(s);
            });
            const queue: [string, number][] = [[lowerCenter, 0]];
            const visited = new Set<string>([lowerCenter]);
            while (queue.length > 0) {
                const [curr, dist] = queue.shift()!;
                const n = newNodes.get(curr);
                if (n) n.distance = dist;
                (adj.get(curr) || []).forEach(nb => {
                    if (!visited.has(nb)) { visited.add(nb); queue.push([nb, dist + 1]); }
                });
            }
            return newNodes;
        });

        setEdges(prev => {
            const next = new Map(prev);
            const lowerCenter = centerWord.toLowerCase();

            if (forceConnectTo) {
                const lowerParent = forceConnectTo.toLowerCase();
                const id = [lowerCenter, lowerParent].sort().join('-');
                if (!next.has(id)) {
                    next.set(id, { 
                        id, 
                        source: lowerParent, 
                        target: lowerCenter,
                        growFrom: lowerCenter // Part du nouveau mot vers le précédent
                    });
                }
            }

            relatedWords.forEach(word => {
                const lowerWord = word.toLowerCase();
                const id = [lowerCenter, lowerWord].sort().join('-');
                if (!next.has(id)) {
                    next.set(id, { 
                        id, 
                        source: lowerCenter, 
                        target: lowerWord,
                        growFrom: lowerCenter // Part du centre vers le fils
                    });
                }
            });
            return next;
        });
    }, [centerWord, relatedWords, forceConnectTo]);

    const targetGroupOffset = useMemo(() => {
        const n = nodes.get(centerWord.toLowerCase());
        return n ? n.targetPos.clone().multiplyScalar(-1) : new THREE.Vector3();
    }, [centerWord, nodes]);

    useFrame(() => {
        // Ralentissement de la translation caméra (0.05 -> 0.02)
        if (groupRef.current) groupRef.current.position.lerp(targetGroupOffset, 0.02);
    });

    return (
        <>
            {/* Caméra orthographic = pas de foreshortening, minZoom/maxZoom au lieu de minDistance/maxDistance */}
            <OrbitControls
                enablePan={false}
                enableZoom={true}
                minZoom={6}
                maxZoom={120}
                dampingFactor={0.05}
            />
            <ambientLight intensity={0.3} />

            <group ref={groupRef}>
                {Array.from(edges.values()).map(edge => {
                    const sn = nodes.get(edge.source);
                    const tn = nodes.get(edge.target);
                    const avg = sn && tn ? (sn.distance! + tn.distance!) / 2 : 0;
                    return (
                        <Edge
                            key={edge.id}
                            sourceId={edge.source}
                            targetId={edge.target}
                            growFromId={edge.growFrom}
                            nodePositionsRef={nodePositionsRef}
                            distance={avg}
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
                    />
                ))}
            </group>
        </>
    );
};

// --- Export ---
export default function Constellation3DV2(props: ConstellationProps) {
    return (
        <div className="absolute inset-0 w-full h-full z-0 bg-void overflow-hidden">
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
                <GraphScene {...props} />
            </Canvas>

            {/* Technical Overlays */}
            <div className="point-grid" />
            <div className="grain-overlay" />
            
            <div className="crosshair-marker crosshair-tl" />
            <div className="crosshair-marker crosshair-tr" />
            <div className="crosshair-marker crosshair-bl" />
            <div className="crosshair-marker crosshair-br" />

            {/* Precision Coordinates Overlay */}
            <div className="absolute bottom-10 right-10 font-mono text-[10px] text-lunar/30 pointer-events-none flex flex-col items-end gap-1 uppercase tracking-widest">
                <span>SYSTEM_STATUS: NOMINAL</span>
                <span>COORD_X: {props.centerWord.toUpperCase()}</span>
                <span>RECON_ACTIVE: TRUE</span>
            </div>
        </div>
    );
}