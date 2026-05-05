import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, OrbitControls, Points, PointMaterial, Float, QuadraticBezierLine, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

interface NodeData {
  id: string;
  word: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  nodeOpacity: number;
  labelOpacity: number;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
}

interface Constellation3DProps {
  centerWord: string;
  relatedWords: string[];
  onWordClick: (word: string) => void;
}

function Scene({ centerWord, relatedWords, onWordClick }: Constellation3DProps) {
  const { camera } = useThree();
  const [nodes, setNodes] = useState<Map<string, NodeData>>(new Map());
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const controlsRef = useRef<any>(null);
  
  // Transition target for camera
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Graph Logic: Persistent Accumulation
  useEffect(() => {
    const isJump = nodes.size > 0 && !nodes.has(centerWord);

    setNodes(prev => {
      const reallyIsJump = prev.size > 0 && !prev.has(centerWord);
      const nextNodes = reallyIsJump ? new Map() : new Map(prev);
      
      // 1. Ensure center node exists
      if (!nextNodes.has(centerWord)) {
        nextNodes.set(centerWord, {
          id: centerWord,
          word: centerWord,
          position: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(0, 0, 0),
          nodeOpacity: 0,
          labelOpacity: 0
        });
      }

      // 2. Global shift so that centerWord is at (0,0,0)
      const currentCenterNode = nextNodes.get(centerWord)!;
      const shift = currentCenterNode.targetPosition.clone().multiplyScalar(-1);
      
      if (shift.length() > 0.001) {
        nextNodes.forEach(node => {
          node.targetPosition.add(shift);
          // Also shift current position so they don't jump, but rather continue their movement
          node.position.add(shift);
        });
        // Reset camera target lookAt during shift
        targetLookAt.current.add(shift);
      }

      // 3. Process Related Words
      const newEdgesList: EdgeData[] = [];
      const parentPos = nextNodes.get(centerWord)!.position.clone();
      
      relatedWords.forEach((word, i) => {
        // Calculate uniform placement on sphere relative to the new center (0,0,0)
        const radius = 6 + (i * 0.4) + Math.random() * 1.5;
        const phi = Math.acos(-1 + (2 * i) / Math.max(relatedWords.length, 10));
        const theta = Math.sqrt(Math.max(relatedWords.length, 10) * Math.PI) * phi;
        
        const relPos = new THREE.Vector3(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        );

        if (!nextNodes.has(word)) {
          nextNodes.set(word, {
            id: word,
            word,
            position: parentPos.clone(),
            targetPosition: relPos,
            nodeOpacity: 0,
            labelOpacity: 0
          });
        } else {
          nextNodes.get(word)!.targetPosition.copy(relPos);
        }

        const edgeId = [centerWord, word].sort().join('-');
        newEdgesList.push({ id: edgeId, source: centerWord, target: word });
      });

      // Accumulate edges (prevent duplicates)
      setEdges(prevEdges => {
        const existingEdges = reallyIsJump ? [] : prevEdges;
        const existingIds = new Set(existingEdges.map(e => e.id));
        const filteredNew = newEdgesList.filter(e => !existingIds.has(e.id));
        return [...existingEdges, ...filteredNew];
      });

      return nextNodes;
    });
  }, [centerWord, relatedWords]);

  // Smooth Motion and Camera
  useFrame((state, delta) => {
    // Lerp Node Positions and Opacities
    nodes.forEach(node => {
      // 1. Move node to target
      node.position.lerp(node.targetPosition, delta * 2.5); // Faster
      
      // 2. Node fade-in
      node.nodeOpacity += (1 - node.nodeOpacity) * delta * 5; // Faster fade

      // 3. Label fade-in: start sooner
      const dist = node.position.distanceTo(node.targetPosition);
      if (dist < 3.0) {
        node.labelOpacity += (1 - node.labelOpacity) * delta * 2;
      }
    });

    // Move camera towards active node but keep distance
    const activeNode = nodes.get(centerWord);
    if (activeNode) {
      const direction = new THREE.Vector3().subVectors(camera.position, activeNode.position).normalize();
      const targetCamPos = activeNode.position.clone().add(direction.multiplyScalar(15));
      camera.position.lerp(targetCamPos, delta * 0.8);
      
      targetLookAt.current.lerp(activeNode.position, delta * 1.2);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#030208']} />
      <fog attach="fog" args={['#030208', 30, 80]} />
      
      <OrbitControls 
        ref={controlsRef}
        enableDamping 
        dampingFactor={0.05} 
        rotateSpeed={0.5}
        zoomSpeed={0.7}
        makeDefault
      />

      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="white" />

      {/* Render Edges as Straight Lines */}
      {edges.map(edge => (
        <Edge3D 
          key={edge.id} 
          edge={edge} 
          nodes={nodes} 
        />
      ))}

      {/* Render Nodes */}
      {Array.from(nodes.values()).map(node => (
        <Node3D 
          key={node.id} 
          node={node} 
          isCenter={node.word === centerWord}
          onClick={() => onWordClick(node.word)} 
        />
      ))}

      {/* Background Dust */}
      <BackgroundStars />
    </>
  );
}

function Edge3D({ edge, nodes }: { edge: EdgeData, nodes: Map<string, NodeData> }) {
  const lineRef = useRef<THREE.Line>(null);
  const posAttrRef = useRef<THREE.BufferAttribute>(null);

  const s = nodes.get(edge.source);
  const t = nodes.get(edge.target);

  useFrame(() => {
    if (lineRef.current && posAttrRef.current && s && t) {
      const positions = posAttrRef.current.array as Float32Array;
      positions[0] = s.position.x;
      positions[1] = s.position.y;
      positions[2] = s.position.z;
      positions[3] = t.position.x;
      positions[4] = t.position.y;
      positions[5] = t.position.z;
      posAttrRef.current.needsUpdate = true;
      
      (lineRef.current.material as THREE.LineBasicMaterial).opacity = Math.min(s.nodeOpacity, t.nodeOpacity) * 0.2;
    }
  });

  if (!s || !t) return null;

  return (
    <line ref={lineRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          ref={posAttrRef}
          attach="attributes-position"
          args={[new Float32Array(6), 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="white" transparent opacity={0} />
    </line>
  );
}

function Node3D({ node, isCenter, onClick }: { node: NodeData, isCenter: boolean, onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.copy(node.position);
    }
    if (meshRef.current) {
      const s = (isCenter ? 1.4 : 1) * (1 + Math.sin(state.clock.elapsedTime * 2 + node.position.x) * 0.1);
      meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh 
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial 
          color={isCenter ? "#fff" : (hovered ? "#00f2fe" : "#fff")} 
          emissive={isCenter ? "#fff" : (hovered ? "#00f2fe" : "#fff")}
          emissiveIntensity={isCenter ? 3 : (hovered ? 5 : 1)}
          transparent
          opacity={node.nodeOpacity}
        />
      </mesh>

      <Html 
        position={[0.2, 0, 0]} 
        center={false}
        occlude={false}
        style={{
          transition: 'opacity 0.8s ease-out',
          opacity: node.labelOpacity,
          pointerEvents: 'none',
          zIndex: isCenter ? 10 : 1
        }}
      >
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          style={{
            color: 'white',
            fontSize: isCenter ? '14px' : '9px',
            fontWeight: isCenter ? '600' : '300',
            fontFamily: '"Cormorant Garamond", serif',
            letterSpacing: '0.25em',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            pointerEvents: 'auto',
            userSelect: 'none',
            textShadow: '0 0 10px rgba(255,255,255,0.3)',
            opacity: hovered ? 1 : 1, // Full visibility for linked words
            transform: hovered ? 'scale(1.05) translateX(8px)' : 'scale(1)',
            transition: 'all 0.6s cubic-bezier(0.2, 0, 0.2, 1)',
          }}
        >
          {node.word.toUpperCase()}
        </div>
      </Html>

      {/* Halo for scintillating effect */}
      <mesh scale={2.5}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial 
          color="#fff" 
          transparent 
          opacity={node.nodeOpacity * 0.15} 
        />
      </mesh>
    </group>
  );
}

function BackgroundStars() {
  const points = useMemo(() => {
    const p = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      p[i * 3] = (Math.random() - 0.5) * 60;
      p[i * 3 + 1] = (Math.random() - 0.5) * 60;
      p[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return p;
  }, []);

  return (
    <Points positions={points}>
      <PointMaterial
        transparent
        color="white"
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
      />
    </Points>
  );
}

export default function Constellation3D(props: Constellation3DProps) {
  return (
    <div className="absolute inset-0 w-full h-full z-0 bg-[#030208]">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
        <Suspense fallback={<Html center><div className="text-white text-[10px] uppercase tracking-[0.2em]">Chargement...</div></Html>}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
      
      {/* Grainy Texture Overlay (Fixed Data URI) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
}
