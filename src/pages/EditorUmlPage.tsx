import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft,
  Save,
  Plus,
  RefreshCw,
  Workflow,
  ShieldAlert,
  CheckCircle2,
  X,
  FileCode,
  Sparkles,
  Code2,
  Trash2,
  Sliders,
  Box,
  Share2,
  ArrowRight,
  StickyNote,
  Palette,
  AlignLeft,
  MousePointer2,
  Lock,
  Mic,
  MicOff,
  Send,
  Bot,
  ChevronDown,
  Download,
  Upload,
} from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import ClaseNode, { AtributoUml, MetodoUml, ClaseNodeData } from '../components/diagrama/ClaseNode';
import RelacionEdge, { TipoRelacionUml, RelacionEdgeData } from '../components/diagrama/RelacionEdge';
import NotaNode, { NotaNodeData } from '../components/diagrama/NotaNode';
import RelacionAnchorNode from '../components/diagrama/RelacionAnchorNode';

interface DiagramaResponseData {
  id: string;
  proyectoId: string;
  nombre: string;
  lienzoUml: {
    clases: Node<any>[];
    relaciones: Edge<RelacionEdgeData>[];
  };
  version: number;
  actualizadoEn?: string;
}

const TIPOS_DATO_ATRIBUTO = [
  '<none>',
  'int',
  'boolean',
  'byte',
  'char',
  'double',
  'float',
  'long',
  'short',
  'String',
  'UUID',
  'Date',
];

const TIPOS_RETORNO_METODO = [
  '<none>',
  'void',
  'int',
  'boolean',
  'byte',
  'char',
  'double',
  'float',
  'long',
  'short',
  'String',
  'UUID',
  'Date',
];

const OPCIONES_MULTIPLICIDAD = ['', '*', '0', '0..*', '0..1', '1', '1..', '1..*'];

const PALETA_COLORES_NOTA = [
  { nombre: 'Amarillo', hex: '#fef08a' },
  { nombre: 'Celeste', hex: '#bae6fd' },
  { nombre: 'Verde', hex: '#bbf7d0' },
  { nombre: 'Rosa', hex: '#fbcfe8' },
  { nombre: 'Púrpura', hex: '#e9d5ff' },
  { nombre: 'Naranja', hex: '#fed7aa' },
];

const nodeTypes = {
  claseNode: ClaseNode,
  notaNode: NotaNode,
  anchorNode: RelacionAnchorNode,
};

const edgeTypes = {
  relacionEdge: RelacionEdge,
};

const EditorUmlPage: React.FC = () => {
  const { diagramaId } = useParams<{ diagramaId: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  // Estados de React Flow
  const [nodes, setNodes] = useState<Node<any>[]>([]);
  const [edges, setEdges] = useState<Edge<RelacionEdgeData>[]>([]);

  // Estados del Diagrama y Concurrencia Optimista
  const [nombreDiagrama, setNombreDiagrama] = useState<string>('Cargando diagrama...');
  const [proyectoId, setProyectoId] = useState<string>('');
  const [versionRegistro, setVersionRegistro] = useState<number>(1);

  // Estados de Selección (Panel Lateral Derecho)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Estados de UI
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorAlerta, setErrorAlerta] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estados de Sesión Colaborativa WebSocket (CU-11 y CU-12)
  const [socketConectado, setSocketConectado] = useState<boolean>(false);
  const [mensajeColaborativo, setMensajeColaborativo] = useState<string | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  // ── Estados de Colaboración Visual Pura (CU-13 y CU-14) ─────────────
  const [cursores, setCursores] = useState<
    Record<string, { x: number; y: number; nombre: string; color: string }>
  >({});
  const [nodosBloqueados, setNodosBloqueados] = useState<
    Record<string, { usuarioId: string; nombre: string; color: string }>
  >({});
  const isRemoteUpdate = useRef<boolean>(false);
  const lastCursorSendRef = useRef<number>(0);
  const nodoBloqueadoLocalRef = useRef<string | null>(null);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);

  // ── CU-15: Interfaz por Voz y Chat (Copiloto NLP) ────────────────────
  const [chatIaAbierto, setChatIaAbierto] = useState<boolean>(false);
  const [mensajesIa, setMensajesIa] = useState<
    Array<{
      id: string;
      remitente: 'usuario' | 'ia';
      texto: string;
      accion?: string;
      hora: string;
    }>
  >([
    {
      id: 'msg_welcome',
      remitente: 'ia',
      texto:
        '¡Hola! Soy tu Copiloto de modelado UML. Dicta con el micrófono o escribe comandos como: "crear clase Factura", "agregar nota...", o "eliminar clase...".',
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputComandoIa, setInputComandoIa] = useState<string>('');
  const [grabandoVoz, setGrabandoVoz] = useState<boolean>(false);
  const [procesandoIa, setProcesandoIa] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // ── CU-17: Interoperabilidad XMI (Enterprise Architect) ─────────────
  const [exportandoXmi, setExportandoXmi] = useState<boolean>(false);
  const [importandoXmi, setImportandoXmi] = useState<boolean>(false);
  const fileInputXmiRef = useRef<HTMLInputElement | null>(null);

  // ── CU-19: Motor de Generacion de Codigo Spring Boot ─────────────────
  const [generandoCodigo, setGenerandoCodigo] = useState<boolean>(false);

  // Modal para agregar clase
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombreNuevaClase, setNombreNuevaClase] = useState('');

  // Formulario de Atributos en Panel Lateral
  const [attrVisibilidad, setAttrVisibilidad] = useState<string>('+');
  const [attrNombre, setAttrNombre] = useState<string>('');
  const [attrTipoDato, setAttrTipoDato] = useState<string>('<none>');

  // Formulario de Métodos en Panel Lateral
  const [metVisibilidad, setMetVisibilidad] = useState<string>('+');
  const [metNombre, setMetNombre] = useState<string>('');
  const [metTipoRetorno, setMetTipoRetorno] = useState<string>('<none>');

  // Entidades seleccionadas actualmente
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  // Nodos origen y destino para la relación seleccionada
  const sourceNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.source) : null;
  const targetNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.target) : null;

  // ── 1. Carga Inicial del Diagrama ──────────────────────────────────
  const cargarDiagrama = useCallback(async () => {
    if (!diagramaId) return;

    setCargando(true);
    setErrorAlerta(null);

    try {
      const res = await api.get<DiagramaResponseData>(`/diagramas/${diagramaId}`);
      setNombreDiagrama(res.data.nombre);
      setProyectoId(res.data.proyectoId);
      setVersionRegistro(res.data.version);

      const clasesCargadas: Node<any>[] = (res.data.lienzoUml?.clases || []).map(
        (node) => {
          if (node.type === 'notaNode') {
            return {
              ...node,
              type: 'notaNode',
              data: {
                texto: node.data?.texto || 'Nota de diseño...',
                colorFondo: node.data?.colorFondo || '#fef08a',
              },
            };
          }
          if (node.type === 'anchorNode') {
            return {
              ...node,
              type: 'anchorNode',
              data: {
                nombre: node.data?.nombre || 'Relación',
              },
            };
          }
          return {
            ...node,
            type: 'claseNode',
            data: {
              ...node.data,
              nombre: node.data?.nombre || 'ClaseSinNombre',
              atributos: Array.isArray(node.data?.atributos) ? node.data.atributos : [],
              metodos: Array.isArray(node.data?.metodos) ? node.data.metodos : [],
            },
          };
        }
      );

      const relacionesCargadas: Edge<RelacionEdgeData>[] = (res.data.lienzoUml?.relaciones || []).map(
        (edge) => ({
          ...edge,
          type: 'relacionEdge',
          data: {
            // ⚠️ CRTICO: spread primero para preservar todos los campos del backend
            // (incluyendo edgeBaseId y nombreBase de las aristas CLASE_ASOCIACION)
            ...edge.data,
            // Solo sobreescribimos con fallback los campos que pueden venir vacíos
            tipoRelacion: edge.data?.tipoRelacion || 'ASOCIACION',
            multiplicidadOrigen: edge.data?.multiplicidadOrigen ?? '',
            multiplicidadDestino: edge.data?.multiplicidadDestino ?? '',
            nombre: edge.data?.nombre ?? '',
          },
        })
      );

      setNodes(clasesCargadas);
      setEdges(relacionesCargadas);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'No se pudo cargar el diagrama desde el servidor.';
      setErrorAlerta(msg);
    } finally {
      setCargando(false);
    }
  }, [diagramaId]);

  useEffect(() => {
    cargarDiagrama();
  }, [cargarDiagrama]);

  // ── CU-15: Inicialización de Web Speech API (Voz a Texto) ───────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setGrabandoVoz(true);
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          setInputComandoIa(transcript);
        }
        setGrabandoVoz(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Error en SpeechRecognition:', event.error);
        setGrabandoVoz(false);
      };

      recognition.onend = () => {
        setGrabandoVoz(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleGrabacionVoz = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta SpeechRecognition nativo. Usa Google Chrome o Microsoft Edge.');
      return;
    }

    if (grabandoVoz) {
      recognitionRef.current.stop();
      setGrabandoVoz(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Error al iniciar SpeechRecognition:', err);
      }
    }
  };

  // Scroll automático en el chat de IA
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [mensajesIa, chatIaAbierto]);

  // ── CU-11: Compartir / Sesión Colaborativa (Generar enlace seguro) ─
  const handleCompartirSesion = async () => {
    if (!diagramaId) return;

    const urlColaborativa = `${window.location.origin}/editor/${diagramaId}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(urlColaborativa);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = urlColaborativa;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setMensajeExito(
        `¡Enlace colaborativo copiado! Comparte con otros usuarios: ${urlColaborativa}`
      );
      setTimeout(() => {
        setMensajeExito(null);
      }, 5000);
    } catch (err) {
      console.error('Error al copiar enlace colaborativo:', err);
      prompt('Copia este enlace para compartir la sesión colaborativa:', urlColaborativa);
    }
  };

  // ── CU-12: Unirse a Sesión Colaborativa (WebSockets STOMP) ─────────
  useEffect(() => {
    if (!diagramaId) return;

    const nombreActual =
      usuario?.nombreCompleto || usuario?.correo || 'Desarrollador';
    const idActual = usuario?.id || 'anonimo';

    // Cliente STOMP sobre WebSockets con soporte para Proxy Reverso / Producción
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = `${protocol}//${window.location.host}/ws-nexus`;
    const brokerURL = (import.meta as any).env?.VITE_WS_URL || defaultWsUrl;

    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.debug('[STOMP Nexus]:', str);
      },
      onConnect: () => {
        console.log(`[STOMP] Conectado exitosamente a la sala /topic/diagrama/${diagramaId}`);
        setSocketConectado(true);

        // Suscripción al canal de difusión de la sala del diagrama
        client.subscribe(`/topic/diagrama/${diagramaId}`, (message) => {
          try {
            const evento = JSON.parse(message.body);

            if (evento.tipo === 'UNION') {
              if (evento.usuarioId !== idActual) {
                setMensajeColaborativo(
                  `👋 ${evento.nombreUsuario || 'Un desarrollador'} se unió a la sesión colaborativa.`
                );
                setTimeout(() => setMensajeColaborativo(null), 4500);
              }
            } else if (evento.tipo === 'SALIDA') {
              if (evento.usuarioId !== idActual) {
                setMensajeColaborativo(
                  `🏃 ${evento.nombreUsuario || 'Un desarrollador'} salió de la sala.`
                );
                setTimeout(() => setMensajeColaborativo(null), 4000);
              }
              // Eliminar cursor del usuario desconectado (CU-14)
              setCursores((prev) => {
                const copia = { ...prev };
                delete copia[evento.usuarioId];
                return copia;
              });
              // Liberar nodos bloqueados por este usuario (CU-13)
              setNodosBloqueados((prev) => {
                const copia = { ...prev };
                Object.keys(copia).forEach((nodoId) => {
                  if (copia[nodoId]?.usuarioId === evento.usuarioId) {
                    delete copia[nodoId];
                  }
                });
                return copia;
              });
            } else if (evento.tipo === 'CURSOR') {
              // Actualizar posición de cursor remoto (CU-14)
              if (evento.usuarioId !== idActual && evento.payload) {
                setCursores((prev) => ({
                  ...prev,
                  [evento.usuarioId]: {
                    x: evento.payload.x,
                    y: evento.payload.y,
                    nombre: evento.nombreUsuario || 'Colaborador',
                    color: evento.payload.color || '#3B82F6',
                  },
                }));
              }
            } else if (evento.tipo === 'SYNC_LIENZO') {
              // Sincronización en vivo de nodos y aristas (CU-14)
              if (evento.usuarioId !== idActual && evento.payload) {
                isRemoteUpdate.current = true;
                try {
                  if (evento.payload.tipoCambio === 'NODES' && Array.isArray(evento.payload.changes)) {
                    setNodes((nds) => applyNodeChanges(evento.payload.changes, nds));
                  } else if (evento.payload.tipoCambio === 'EDGES' && Array.isArray(evento.payload.changes)) {
                    setEdges((eds) => applyEdgeChanges(evento.payload.changes, eds));
                  } else if (evento.payload.tipoCambio === 'FULL_NODES' && Array.isArray(evento.payload.nodes)) {
                    setNodes(evento.payload.nodes);
                  } else if (evento.payload.tipoCambio === 'FULL_EDGES' && Array.isArray(evento.payload.edges)) {
                    setEdges(evento.payload.edges);
                  }
                } finally {
                  isRemoteUpdate.current = false;
                }
              }
            } else if (evento.tipo === 'BLOQUEO_NODO') {
              // Exclusión mutua visual: bloqueo por otro usuario (CU-13)
              if (evento.usuarioId !== idActual && evento.payload?.nodoId) {
                const { nodoId, color, nombre } = evento.payload;
                setNodosBloqueados((prev) => ({
                  ...prev,
                  [nodoId]: {
                    usuarioId: evento.usuarioId,
                    color: color || '#EF4444',
                    nombre: nombre || evento.nombreUsuario || 'Colaborador',
                  },
                }));
              }
            } else if (evento.tipo === 'LIBERAR_NODO') {
              // Exclusión mutua visual: liberar bloqueo (CU-13)
              if (evento.payload?.nodoId) {
                const { nodoId } = evento.payload;
                setNodosBloqueados((prev) => {
                  const copia = { ...prev };
                  delete copia[nodoId];
                  return copia;
                });
              }
            }
          } catch (err) {
            console.error('[STOMP] Error al procesar evento:', err);
          }
        });

        // Envío del evento inicial 'UNION' anunciando la llegada a la sala (CU-12)
        client.publish({
          destination: `/app/diagrama/${diagramaId}`,
          body: JSON.stringify({
            tipo: 'UNION',
            usuarioId: idActual,
            nombreUsuario: nombreActual,
            payload: {
              fechaConexion: new Date().toISOString(),
            },
          }),
        });
      },
      onDisconnect: () => {
        console.log('[STOMP] Desconectado del servidor STOMP');
        setSocketConectado(false);
      },
      onWebSocketClose: () => {
        setSocketConectado(false);
      },
      onStompError: (frame) => {
        console.warn('[STOMP Error del broker]:', frame.headers['message'], frame.body);
        setSocketConectado(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client.active) {
        try {
          if (nodoBloqueadoLocalRef.current) {
            client.publish({
              destination: `/app/diagrama/${diagramaId}`,
              body: JSON.stringify({
                tipo: 'LIBERAR_NODO',
                usuarioId: idActual,
                nombreUsuario: nombreActual,
                payload: {
                  nodoId: nodoBloqueadoLocalRef.current,
                },
              }),
            });
          }
          client.publish({
            destination: `/app/diagrama/${diagramaId}`,
            body: JSON.stringify({
              tipo: 'SALIDA',
              usuarioId: idActual,
              nombreUsuario: nombreActual,
              payload: {
                fechaSalida: new Date().toISOString(),
              },
            }),
          });
        } catch {
          // Ignorar error al cerrar
        }
        client.deactivate();
      }
    };
  }, [diagramaId, usuario]);

  // ── Emisión de eventos colaborativos auxiliares ─────────────────────
  const broadcastLienzoState = useCallback(
    (tipo: 'FULL_NODES' | 'FULL_EDGES', data: any[]) => {
      if (!stompClientRef.current?.active || !diagramaId) return;
      stompClientRef.current.publish({
        destination: `/app/diagrama/${diagramaId}`,
        body: JSON.stringify({
          tipo: 'SYNC_LIENZO',
          usuarioId: usuario?.id || 'anonimo',
          nombreUsuario: usuario?.nombreCompleto || usuario?.correo || 'Desarrollador',
          payload: {
            tipoCambio: tipo,
            [tipo === 'FULL_NODES' ? 'nodes' : 'edges']: data,
          },
        }),
      });
    },
    [diagramaId, usuario]
  );

  const emitirBloqueoNodo = useCallback(
    (nodoId: string) => {
      if (!stompClientRef.current?.active || !diagramaId) return;
      const color = usuario?.colorCursor || '#3B82F6';
      const nombre = usuario?.nombreCompleto || usuario?.correo || 'Desarrollador';

      stompClientRef.current.publish({
        destination: `/app/diagrama/${diagramaId}`,
        body: JSON.stringify({
          tipo: 'BLOQUEO_NODO',
          usuarioId: usuario?.id || 'anonimo',
          nombreUsuario: nombre,
          payload: {
            nodoId,
            color,
            nombre,
          },
        }),
      });
    },
    [diagramaId, usuario]
  );

  const emitirLiberarNodo = useCallback(
    (nodoId: string) => {
      if (!stompClientRef.current?.active || !diagramaId) return;

      stompClientRef.current.publish({
        destination: `/app/diagrama/${diagramaId}`,
        body: JSON.stringify({
          tipo: 'LIBERAR_NODO',
          usuarioId: usuario?.id || 'anonimo',
          nombreUsuario: usuario?.nombreCompleto || usuario?.correo || 'Desarrollador',
          payload: {
            nodoId,
          },
        }),
      });
    },
    [diagramaId, usuario]
  );

  // ── CU-15: Procesar Comando NLP (Chat / Voz) y Dibujar en Lienzo ───
  const enviarComandoIa = async () => {
    const texto = inputComandoIa.trim();
    if (!texto || procesandoIa) return;

    const mensajeUsuarioId = uuidv4();
    const horaActual = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Agregar mensaje del usuario a la conversación
    setMensajesIa((prev) => [
      ...prev,
      {
        id: mensajeUsuarioId,
        remitente: 'usuario',
        texto,
        hora: horaActual,
      },
    ]);

    setInputComandoIa('');
    setProcesandoIa(true);

    try {
      // 2. Invocar endpoint NLP en Spring Boot
      const res = await api.post<{
        accion: string;
        parametros: Record<string, any>;
        mensaje: string;
      }>('/ia/procesar-comando', {
        texto,
        usuarioId: usuario?.id,
      });

      const { accion, parametros, mensaje } = res.data;

      // 3. Ejecutar la acción interpretada sobre el estado del lienzo
      if (accion === 'CREAR_CLASE') {
        const nombreClase = (parametros?.nombre as string) || 'NuevaClase';
        const posX = 160 + (nodes.length % 4) * 120 + Math.floor(Math.random() * 40);
        const posY = 140 + (nodes.length % 4) * 80 + Math.floor(Math.random() * 40);

        const nuevoNodo: Node<ClaseNodeData> = {
          id: uuidv4(),
          type: 'claseNode',
          position: { x: posX, y: posY },
          data: {
            nombre: nombreClase,
            atributos: [
              {
                id: uuidv4(),
                visibilidad: '+',
                nombre: 'id',
                tipoDato: 'UUID',
              },
            ],
            metodos: [
              {
                id: uuidv4(),
                visibilidad: '+',
                nombre: 'getId',
                tipoRetorno: 'UUID',
              },
            ],
          },
        };

        setNodes((prevNodes) => {
          const nextNodes = [...prevNodes, nuevoNodo];
          // CRÍTICO: Emitir el evento SYNC_LIENZO por WebSockets para colaboración en tiempo real
          broadcastLienzoState('FULL_NODES', nextNodes);
          return nextNodes;
        });
      } else if (accion === 'CREAR_NOTA') {
        const textoNota = (parametros?.texto as string) || 'Nota de diseño...';
        const posX = 180 + Math.floor(Math.random() * 60);
        const posY = 180 + Math.floor(Math.random() * 60);

        const nuevaNota: Node<NotaNodeData> = {
          id: uuidv4(),
          type: 'notaNode',
          position: { x: posX, y: posY },
          data: {
            texto: textoNota,
            colorFondo: '#fef08a',
          },
        };

        setNodes((prevNodes) => {
          const nextNodes = [...prevNodes, nuevaNota];
          broadcastLienzoState('FULL_NODES', nextNodes);
          return nextNodes;
        });
      } else if (accion === 'ELIMINAR_CLASE') {
        const nombreClase = (parametros?.nombre as string) || '';
        if (nombreClase) {
          setNodes((prevNodes) => {
            const nextNodes = prevNodes.filter(
              (n) => n.data?.nombre?.toLowerCase() !== nombreClase.toLowerCase()
            );
            broadcastLienzoState('FULL_NODES', nextNodes);
            return nextNodes;
          });
        }
      } else if (accion === 'AGREGAR_ATRIBUTO') {
        const nombreAttr = (parametros?.nombre as string) || 'nuevoAtributo';
        const claseDestino = (parametros?.clase as string) || '';
        const tipoDato = (parametros?.tipoDato as string) || 'String';

        if (claseDestino) {
          setNodes((prevNodes) => {
            const nextNodes = prevNodes.map((n) => {
              if (n.data?.nombre?.toLowerCase() === claseDestino.toLowerCase()) {
                const nuevosAttrs = [
                  ...(n.data.atributos || []),
                  {
                    id: uuidv4(),
                    visibilidad: '+',
                    nombre: nombreAttr,
                    tipoDato,
                  },
                ];
                return {
                  ...n,
                  data: {
                    ...n.data,
                    atributos: nuevosAttrs,
                  },
                };
              }
              return n;
            });
            broadcastLienzoState('FULL_NODES', nextNodes);
            return nextNodes;
          });
        }
      } else if (accion === 'CREAR_RELACION') {
        const origen = (parametros?.origen as string) || '';
        const destino = (parametros?.destino as string) || '';
        const nodoOrigen = nodes.find(
          (n) => n.data?.nombre?.toLowerCase() === origen.toLowerCase()
        );
        const nodoDestino = nodes.find(
          (n) => n.data?.nombre?.toLowerCase() === destino.toLowerCase()
        );

        if (nodoOrigen && nodoDestino) {
          const nuevaArista: Edge<RelacionEdgeData> = {
            id: `e-${nodoOrigen.id}-${nodoDestino.id}-${Date.now()}`,
            source: nodoOrigen.id,
            target: nodoDestino.id,
            type: 'relacionEdge',
            data: {
              tipoRelacion: 'ASOCIACION',
              multiplicidadOrigen: '',
              multiplicidadDestino: '',
              nombre: '',
            },
          };

          setEdges((prevEdges) => {
            const nextEdges = [...prevEdges, nuevaArista];
            broadcastLienzoState('FULL_EDGES', nextEdges);
            return nextEdges;
          });
        }
      }

      // 4. Agregar respuesta de la IA al historial de chat
      setMensajesIa((prev) => [
        ...prev,
        {
          id: uuidv4(),
          remitente: 'ia',
          texto: mensaje || 'Comando procesado correctamente.',
          accion: accion !== 'NO_RECONOCIDO' ? accion : undefined,
          hora: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Error de comunicación con el motor NLP local.';
      setMensajesIa((prev) => [
        ...prev,
        {
          id: uuidv4(),
          remitente: 'ia',
          texto: `⚠️ ${errorMsg}`,
          hora: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } finally {
      setProcesandoIa(false);
    }
  };

  // ── Captura de Movimiento de Cursor con Throttle (CU-14) ─────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!socketConectado || !stompClientRef.current?.active || !diagramaId) return;

      const now = Date.now();
      if (now - lastCursorSendRef.current < 50) return; // Throttle 50ms
      lastCursorSendRef.current = now;

      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);

      stompClientRef.current.publish({
        destination: `/app/diagrama/${diagramaId}`,
        body: JSON.stringify({
          tipo: 'CURSOR',
          usuarioId: usuario?.id || 'anonimo',
          nombreUsuario: usuario?.nombreCompleto || usuario?.correo || 'Desarrollador',
          payload: {
            x,
            y,
            color: usuario?.colorCursor || '#3B82F6',
          },
        }),
      });
    },
    [socketConectado, diagramaId, usuario]
  );

  // ── 2. Manejadores de Eventos React Flow ────────────────────────────
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      if (!isRemoteUpdate.current && stompClientRef.current?.active && diagramaId) {
        stompClientRef.current.publish({
          destination: `/app/diagrama/${diagramaId}`,
          body: JSON.stringify({
            tipo: 'SYNC_LIENZO',
            usuarioId: usuario?.id || 'anonimo',
            nombreUsuario: usuario?.nombreCompleto || usuario?.correo || 'Desarrollador',
            payload: {
              tipoCambio: 'NODES',
              changes,
            },
          }),
        });
      }
    },
    [diagramaId, usuario]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));

      if (!isRemoteUpdate.current && stompClientRef.current?.active && diagramaId) {
        stompClientRef.current.publish({
          destination: `/app/diagrama/${diagramaId}`,
          body: JSON.stringify({
            tipo: 'SYNC_LIENZO',
            usuarioId: usuario?.id || 'anonimo',
            nombreUsuario: usuario?.nombreCompleto || usuario?.correo || 'Desarrollador',
            payload: {
              tipoCambio: 'EDGES',
              changes,
            },
          }),
        });
      }
    },
    [diagramaId, usuario]
  );

  // CU-09: Trazar Relaciones UML
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const nuevaRelacion: Edge<RelacionEdgeData> = {
        ...params,
        id: `rel_${uuidv4().substring(0, 8)}`,
        type: 'relacionEdge',
        data: {
          tipoRelacion: 'ASOCIACION',
          multiplicidadOrigen: '',
          multiplicidadDestino: '',
          nombre: '',
        },
      };

      setEdges((eds) => {
        const nextEdges = addEdge(nuevaRelacion, eds);
        broadcastLienzoState('FULL_EDGES', nextEdges);
        return nextEdges;
      });
    },
    [broadcastLienzoState]
  );

  // Validación de conexiones: bloquear si origen o destino son notas adhesivas (notaNode)
  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;
      if (sourceNode.type === 'notaNode' || targetNode.type === 'notaNode') {
        return false;
      }
      return true;
    },
    [nodes]
  );

  // CU-13: Selección y Bloqueo de Nodo
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const bloqueo = nodosBloqueados[node.id];
      if (bloqueo && bloqueo.usuarioId !== (usuario?.id || 'anonimo')) {
        setMensajeColaborativo(
          `🔒 Nodo bloqueado en exclusión mutua por ${bloqueo.nombre}`
        );
        setTimeout(() => setMensajeColaborativo(null), 3500);
        return;
      }

      if (nodoBloqueadoLocalRef.current && nodoBloqueadoLocalRef.current !== node.id) {
        emitirLiberarNodo(nodoBloqueadoLocalRef.current);
      }

      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      nodoBloqueadoLocalRef.current = node.id;
      emitirBloqueoNodo(node.id);
    },
    [nodosBloqueados, usuario, emitirBloqueoNodo, emitirLiberarNodo]
  );

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const bloqueo = nodosBloqueados[node.id];
      if (bloqueo && bloqueo.usuarioId !== (usuario?.id || 'anonimo')) {
        return;
      }

      if (nodoBloqueadoLocalRef.current !== node.id) {
        if (nodoBloqueadoLocalRef.current) {
          emitirLiberarNodo(nodoBloqueadoLocalRef.current);
        }
        nodoBloqueadoLocalRef.current = node.id;
        emitirBloqueoNodo(node.id);
      }
    },
    [nodosBloqueados, usuario, emitirBloqueoNodo, emitirLiberarNodo]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      emitirLiberarNodo(node.id);
      if (nodoBloqueadoLocalRef.current === node.id && selectedNodeId !== node.id) {
        nodoBloqueadoLocalRef.current = null;
      }
    },
    [emitirLiberarNodo, selectedNodeId]
  );

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    if (nodoBloqueadoLocalRef.current) {
      emitirLiberarNodo(nodoBloqueadoLocalRef.current);
      nodoBloqueadoLocalRef.current = null;
    }
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [emitirLiberarNodo]);

  // CU-13: Modificación dinámica de nodos para Exclusión Mutua Visual
  const displayNodes = React.useMemo(() => {
    return nodes.map((node) => {
      const bloqueo = nodosBloqueados[node.id];
      const bloqueadoPorOtro =
        bloqueo && bloqueo.usuarioId !== (usuario?.id || 'anonimo');

      if (bloqueadoPorOtro) {
        return {
          ...node,
          draggable: false,
          selectable: false,
          style: {
            ...node.style,
            boxShadow: `0 0 0 3px ${bloqueo.color}, 0 0 25px ${bloqueo.color}90`,
            borderRadius: '16px',
            transition: 'box-shadow 0.2s ease, transform 0.1s ease',
            filter: 'brightness(1.05)',
            cursor: 'not-allowed',
          },
        };
      }

      const bloqueadoPorMi =
        bloqueo && bloqueo.usuarioId === (usuario?.id || 'anonimo');
      if (bloqueadoPorMi) {
        return {
          ...node,
          style: {
            ...node.style,
            boxShadow: `0 0 0 2px ${bloqueo.color}, 0 0 16px ${bloqueo.color}60`,
            borderRadius: '16px',
            transition: 'box-shadow 0.2s ease',
          },
        };
      }

      return node;
    });
  }, [nodes, nodosBloqueados, usuario?.id]);

  // ── 3. Guardado con Control de Concurrencia Optimista ───────────────
  const guardarLienzo = async () => {
    if (!diagramaId) return;

    setGuardando(true);
    setErrorAlerta(null);
    setMensajeExito(null);

    try {
      const payload = {
        lienzoUml: {
          clases: nodes,
          relaciones: edges,
        },
        version: versionRegistro,
      };

      const res = await api.put<DiagramaResponseData>(
        `/diagramas/${diagramaId}/lienzo`,
        payload
      );

      setVersionRegistro(res.data.version);
      setMensajeExito(
        `¡Diagrama guardado exitosamente! Versión actualizada a v${res.data.version}.`
      );

      setTimeout(() => {
        setMensajeExito(null);
      }, 4000);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            detail?: string;
            message?: string;
          };
        };
      };

      if (axiosErr.response?.status === 409) {
        const msg =
          axiosErr.response.data?.detail ||
          axiosErr.response.data?.message ||
          'El diagrama fue modificado por otro usuario en tiempo real. Por favor, actualiza tu lienzo';
        setErrorAlerta(msg);
      } else {
        setErrorAlerta('Error al guardar el lienzo. Por favor revisa la conexión con el backend.');
      }
    } finally {
      setGuardando(false);
    }
  };

  // ── CU-19: Generar Proyecto Spring Boot y descargar como ZIP ─────────
  const handleGenerarCodigo = async () => {
    if (!diagramaId) return;
    try {
      setGenerandoCodigo(true);
      setErrorAlerta(null);

      // Usamos fetch nativo para manejar la respuesta binaria (Blob ZIP)
      const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/generador/${diagramaId}/springboot`);

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || `Error ${response.status} al generar el backend`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backend_springboot_${diagramaId.substring(0, 8)}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMensajeExito('¡Proyecto Spring Boot generado y descargado exitosamente!');
      setTimeout(() => setMensajeExito(null), 4500);
    } catch (err: unknown) {
      const msg =
        (err instanceof Error ? err.message : null) ??
        'Error al generar el código Spring Boot. Verifica que el backend esté corriendo.';
      setErrorAlerta(msg);
      setTimeout(() => setErrorAlerta(null), 5000);
    } finally {
      setGenerandoCodigo(false);
    }
  };

  // ── CU-17: Exportar a XMI 2.1 (Enterprise Architect) ────────────────
  const handleExportarXmi = async () => {
    if (!diagramaId) return;
    setExportandoXmi(true);
    try {
      const response = await api.get(`/diagramas/${diagramaId}/exportar-xmi`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/xml;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nombreLimpio = (nombreDiagrama || 'diagrama')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      link.setAttribute('download', `${nombreLimpio}_ea.xmi`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMensajeExito('¡Diagrama exportado exitosamente en formato XMI 2.1 (Enterprise Architect)!');
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: unknown) {
      console.error('Error al exportar XMI:', err);
      setErrorAlerta('No se pudo generar la exportación XMI del diagrama.');
      setTimeout(() => setErrorAlerta(null), 5000);
    } finally {
      setExportandoXmi(false);
    }
  };

  // ── CU-17: Importar desde XMI (Enterprise Architect) y Sincronizar ──
  const handleImportarXmi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !diagramaId) return;

    // Resetear valor para permitir seleccionar el mismo archivo si es necesario
    e.target.value = '';

    setImportandoXmi(true);
    setErrorAlerta(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post<DiagramaResponseData>(
        `/diagramas/${diagramaId}/importar-xmi`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // 1. Extraer y formatear clases y relaciones actualizadas
      const clasesImportadas: Node<any>[] = (res.data.lienzoUml?.clases || []).map(
        (node) => {
          if (node.type === 'notaNode') {
            return {
              ...node,
              type: 'notaNode',
              data: {
                texto: node.data?.texto || 'Nota de diseño...',
                colorFondo: node.data?.colorFondo || '#fef08a',
              },
            };
          }
          if (node.type === 'anchorNode') {
            return {
              ...node,
              type: 'anchorNode',
              data: {
                nombre: node.data?.nombre || 'Relación',
              },
            };
          }
          return {
            ...node,
            type: 'claseNode',
            data: {
              ...node.data,
              nombre: node.data?.nombre || 'ClaseSinNombre',
              atributos: Array.isArray(node.data?.atributos) ? node.data.atributos : [],
              metodos: Array.isArray(node.data?.metodos) ? node.data.metodos : [],
            },
          };
        }
      );

      const relacionesImportadas: Edge<RelacionEdgeData>[] = (
        res.data.lienzoUml?.relaciones || []
      ).map((edge) => ({
        ...edge,
        type: 'relacionEdge',
        data: {
          // ⚠️ CRTICO: spread primero para preservar edgeBaseId y nombreBase
          ...edge.data,
          tipoRelacion: edge.data?.tipoRelacion || 'ASOCIACION',
          multiplicidadOrigen: edge.data?.multiplicidadOrigen ?? '',
          multiplicidadDestino: edge.data?.multiplicidadDestino ?? '',
          nombre: edge.data?.nombre ?? '',
        },
      }));

      // 2. Actualizar estado visual local en React Flow
      setNodes(clasesImportadas);
      setEdges(relacionesImportadas);
      if (res.data.version) {
        setVersionRegistro(res.data.version);
      }

      // 3. CRÍTICO para la Colaboración: Emitir por WebSockets para sincronizar en vivo
      broadcastLienzoState('FULL_NODES', clasesImportadas);
      broadcastLienzoState('FULL_EDGES', relacionesImportadas);

      setMensajeExito(
        `¡Diagrama XMI importado con éxito! Se cargaron ${clasesImportadas.length} clases/notas y ${relacionesImportadas.length} relaciones sincronizadas en tiempo real.`
      );
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      console.error('Error al importar archivo XMI:', err);
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        'Error al procesar el archivo XMI. Verifica que sea un formato XML/XMI válido de Enterprise Architect.';
      setErrorAlerta(msg);
      setTimeout(() => setErrorAlerta(null), 6000);
    } finally {
      setImportandoXmi(false);
    }
  };

  // ── 4. Creación de Clase UML (CU-07) ───────────────────────────────
  const abrirModalNuevaClase = () => {
    const contador = nodes.filter((n) => n.type === 'claseNode').length + 1;
    setNombreNuevaClase(`Entidad${contador}`);
    setIsModalOpen(true);
  };

  const handleCrearClase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevaClase.trim()) return;

    const nuevoId = uuidv4();
    const nuevoNodo: Node<ClaseNodeData> = {
      id: nuevoId,
      type: 'claseNode',
      position: {
        x: Math.floor(Math.random() * 250) + 180,
        y: Math.floor(Math.random() * 200) + 100,
      },
      data: {
        nombre: nombreNuevaClase.trim(),
        atributos: [],
        metodos: [],
      },
    };

    setNodes((nds) => {
      const nextNodes = nds.concat(nuevoNodo);
      broadcastLienzoState('FULL_NODES', nextNodes);
      return nextNodes;
    });
    setIsModalOpen(false);
    setSelectedNodeId(nuevoId);
    setSelectedEdgeId(null);
    nodoBloqueadoLocalRef.current = nuevoId;
    emitirBloqueoNodo(nuevoId);
  };

  // ── 5. Creación de Nota Adhesiva (CU-10) ────────────────────────────
  const handleAgregarNota = () => {
    const nuevoId = uuidv4();
    const nuevoNodo: Node<NotaNodeData> = {
      id: nuevoId,
      type: 'notaNode',
      position: {
        x: Math.floor(Math.random() * 250) + 160,
        y: Math.floor(Math.random() * 200) + 120,
      },
      data: {
        texto: 'Nota de arquitectura:\nRecordar aplicar herencia para clases de dominio y aislar las reglas de negocio.',
        colorFondo: '#fef08a',
      },
    };

    setNodes((nds) => {
      const nextNodes = nds.concat(nuevoNodo);
      broadcastLienzoState('FULL_NODES', nextNodes);
      return nextNodes;
    });
    setSelectedNodeId(nuevoId);
    setSelectedEdgeId(null);
    nodoBloqueadoLocalRef.current = nuevoId;
    emitirBloqueoNodo(nuevoId);
  };

  // ── 6. Modificación de Notas (CU-10) ────────────────────────────────
  const handleCambiarTextoNota = (nuevoTexto: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              texto: nuevoTexto,
            },
          };
        }
        return node;
      })
    );
  };

  const handleCambiarColorFondoNota = (colorHex: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              colorFondo: colorHex,
            },
          };
        }
        return node;
      })
    );
  };

  // ── 7. Gestión de Atributos y Métodos (CU-08) ────────────────────────
  const handleAgregarAtributo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !attrNombre.trim()) return;

    const nuevoAtributo: AtributoUml = {
      id: uuidv4(),
      visibilidad: attrVisibilidad,
      nombre: attrNombre.trim(),
      tipoDato: attrTipoDato,
    };

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          const actuales = Array.isArray(node.data.atributos) ? node.data.atributos : [];
          return {
            ...node,
            data: {
              ...node.data,
              atributos: [...actuales, nuevoAtributo],
            },
          };
        }
        return node;
      })
    );

    setAttrNombre('');
    setAttrTipoDato('<none>');
  };

  const handleEliminarAtributo = (attrId: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          const actuales = Array.isArray(node.data.atributos) ? node.data.atributos : [];
          return {
            ...node,
            data: {
              ...node.data,
              atributos: actuales.filter((a) => a.id !== attrId),
            },
          };
        }
        return node;
      })
    );
  };

  const handleEditarTipoAtributo = (attrId: string, nuevoTipo: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) => {
      const nextNodes = nds.map((n) => {
        if (n.id === selectedNodeId) {
          const nextAttrs = n.data.atributos.map((a: any) =>
            a.id === attrId ? { ...a, tipoDato: nuevoTipo } : a
          );
          return { ...n, data: { ...n.data, atributos: nextAttrs } };
        }
        return n;
      });
      broadcastLienzoState('FULL_NODES', nextNodes);
      return nextNodes;
    });
  };

  const handleAgregarMetodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !metNombre.trim()) return;

    const nuevoMetodo: MetodoUml = {
      id: uuidv4(),
      visibilidad: metVisibilidad,
      nombre: metNombre.trim(),
      tipoRetorno: metTipoRetorno,
    };

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          const actuales = Array.isArray(node.data.metodos) ? node.data.metodos : [];
          return {
            ...node,
            data: {
              ...node.data,
              metodos: [...actuales, nuevoMetodo],
            },
          };
        }
        return node;
      })
    );

    setMetNombre('');
    setMetTipoRetorno('<none>');
  };

  const handleEliminarMetodo = (metId: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          const actuales = Array.isArray(node.data.metodos) ? node.data.metodos : [];
          return {
            ...node,
            data: {
              ...node.data,
              metodos: actuales.filter((m) => m.id !== metId),
            },
          };
        }
        return node;
      })
    );
  };

  const handleEditarTipoMetodo = (metId: string, nuevoTipo: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) => {
      const nextNodes = nds.map((n) => {
        if (n.id === selectedNodeId) {
          const nextMets = n.data.metodos.map((m: any) =>
            m.id === metId ? { ...m, tipoRetorno: nuevoTipo } : m
          );
          return { ...n, data: { ...n.data, metodos: nextMets } };
        }
        return n;
      });
      broadcastLienzoState('FULL_NODES', nextNodes);
      return nextNodes;
    });
  };

  const handleCambiarNombreClase = (nuevoNombre: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              nombre: nuevoNombre,
            },
          };
        }
        return node;
      })
    );
  };

  const handleEliminarNodo = () => {
    if (!selectedNodeId) return;
    const nodoIdAEliminar = selectedNodeId;
    emitirLiberarNodo(nodoIdAEliminar);
    if (nodoBloqueadoLocalRef.current === nodoIdAEliminar) {
      nodoBloqueadoLocalRef.current = null;
    }

    setNodes((nds) => {
      const nextNodes = nds.filter((n) => n.id !== nodoIdAEliminar);
      broadcastLienzoState('FULL_NODES', nextNodes);
      return nextNodes;
    });
    setEdges((eds) => {
      const nextEdges = eds.filter(
        (e) => e.source !== nodoIdAEliminar && e.target !== nodoIdAEliminar
      );
      broadcastLienzoState('FULL_EDGES', nextEdges);
      return nextEdges;
    });
    setSelectedNodeId(null);
  };

  // ── 8. Modificación Dinámica de Relaciones UML (CU-09) ───────────────
  const handleCambiarTipoRelacion = (nuevoTipo: TipoRelacionUml) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdgeId) {
          return {
            ...edge,
            data: {
              ...edge.data,
              tipoRelacion: nuevoTipo,
            },
          };
        }
        return edge;
      })
    );
  };

  // ── Magia Muchos-a-Muchos: Conversión a Clase Intermedia con CLASE_ASOCIACION ──
  const transformarMuchosAMuchos = (
    edgeId: string,
    multOrigen: string,
    multDestino: string
  ) => {
    const currentEdge = edges.find((e) => e.id === edgeId);
    if (!currentEdge) return;

    const source = nodes.find((n) => n.id === currentEdge.source);
    const target = nodes.find((n) => n.id === currentEdge.target);
    if (!source || !target) return;

    const nombreSource = String(source.data?.nombre || 'Origen').trim();
    const nombreTarget = String(target.data?.nombre || 'Destino').trim();
    const nombreIntermedia = `${nombreSource}_${nombreTarget}`;

    // Compensar el ancho y alto estimado de las clases (Centro de Clase = posición + mitad del tamaño)
    const sourceCenterX = (source.position?.x ?? 0) + 125;
    const sourceCenterY = (source.position?.y ?? 0) + 75;
    const targetCenterX = (target.position?.x ?? 0) + 125;
    const targetCenterY = (target.position?.y ?? 0) + 75;

    // Centro exacto entre ambas clases
    const midPosX = Math.round((sourceCenterX + targetCenterX) / 2);
    const midPosY = Math.round((sourceCenterY + targetCenterY) / 2);

    // Posición de la nueva tabla intermedia
    const nuevaClasePosX = midPosX + 60;
    const nuevaClasePosY = midPosY + 100;

    const nuevaClaseId = uuidv4();
    const nuevaClaseNode: Node<ClaseNodeData> = {
      id: nuevaClaseId,
      type: 'claseNode',
      position: { x: nuevaClasePosX, y: nuevaClasePosY },
      data: {
        nombre: nombreIntermedia,
        atributos: [
          {
            id: uuidv4(),
            visibilidad: '-',
            nombre: `id_${nombreSource.toLowerCase()}`,
            tipoDato: 'UUID',
          },
          {
            id: uuidv4(),
            visibilidad: '-',
            nombre: `id_${nombreTarget.toLowerCase()}`,
            tipoDato: 'UUID',
          },
        ],
        metodos: [],
      },
    };

    // Crear la relación punteada de tipo 'CLASE_ASOCIACION' con edgeBaseId apuntando a la relación original
    const edgeClaseAsociacion: Edge<RelacionEdgeData> = {
      id: `rel_${uuidv4().substring(0, 8)}`,
      source: nuevaClaseId,
      target: source.id,
      type: 'relacionEdge',
      data: {
        tipoRelacion: 'CLASE_ASOCIACION',
        edgeBaseId: edgeId,
        nombreBase: nombreIntermedia,
      },
    };

    // Actualizar el edge M:N base original con las nuevas multiplicidades y agregar el edge de clase de asociación
    const nextEdges = edges
      .map((e) => {
        if (e.id === edgeId) {
          return {
            ...e,
            data: {
              ...e.data,
              multiplicidadOrigen: multOrigen,
              multiplicidadDestino: multDestino,
            },
          };
        }
        return e;
      })
      .concat([edgeClaseAsociacion]);

    // Agregar el nuevo claseNode sin crear nodos ancla falsos
    const nextNodes = [...nodes, nuevaClaseNode];

    setNodes(nextNodes);
    setEdges(nextEdges);

    // Disparar broadcastLienzoState para sincronizar en tiempo real con toda la sala
    broadcastLienzoState('FULL_NODES', nextNodes);
    broadcastLienzoState('FULL_EDGES', nextEdges);

    setMensajeExito(
      `¡Clase de Asociación configurada! Se vinculó la clase '${nombreIntermedia}' directamente al centro de la relación Muchos-a-Muchos.`
    );
    setTimeout(() => setMensajeExito(null), 4500);
  };

  // Helper para verificar si un extremo de la relación representa pluralidad (*)
  const esMuchos = (mult: string) => typeof mult === 'string' && mult.includes('*');

  const handleCambiarMultiplicidadOrigen = (nuevaMult: string) => {
    if (!selectedEdgeId) return;

    const currentEdge = edges.find((e) => e.id === selectedEdgeId);
    const multDestino = String(currentEdge?.data?.multiplicidadDestino || '');

    // Evaluar si ambos extremos representan pluralidad (M:N) ante interacción manual
    if (esMuchos(nuevaMult) && esMuchos(multDestino)) {
      transformarMuchosAMuchos(selectedEdgeId, nuevaMult, multDestino);
      return;
    }

    setEdges((eds) => {
      const nextEdges = eds.map((edge) => {
        if (edge.id === selectedEdgeId) {
          return {
            ...edge,
            data: {
              ...edge.data,
              multiplicidadOrigen: nuevaMult,
            },
          };
        }
        return edge;
      });
      broadcastLienzoState('FULL_EDGES', nextEdges);
      return nextEdges;
    });
  };

  const handleCambiarMultiplicidadDestino = (nuevaMult: string) => {
    if (!selectedEdgeId) return;

    const currentEdge = edges.find((e) => e.id === selectedEdgeId);
    const multOrigen = String(currentEdge?.data?.multiplicidadOrigen || '');

    // Evaluar si ambos extremos representan pluralidad (M:N) ante interacción manual
    if (esMuchos(nuevaMult) && esMuchos(multOrigen)) {
      transformarMuchosAMuchos(selectedEdgeId, multOrigen, nuevaMult);
      return;
    }

    setEdges((eds) => {
      const nextEdges = eds.map((edge) => {
        if (edge.id === selectedEdgeId) {
          return {
            ...edge,
            data: {
              ...edge.data,
              multiplicidadDestino: nuevaMult,
            },
          };
        }
        return edge;
      });
      broadcastLienzoState('FULL_EDGES', nextEdges);
      return nextEdges;
    });
  };

  const handleCambiarNombreRelacion = (nuevoNombre: string) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdgeId) {
          return {
            ...edge,
            data: {
              ...edge.data,
              nombre: nuevoNombre,
            },
          };
        }
        return edge;
      })
    );
  };

  const handleEliminarRelacion = () => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };
  /* <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden select-none">*/
  return (
    <div className="h-screen w-screen bg-black text-slate-100 flex flex-col relative overflow-hidden select-none">
      {/* ── Topbar del Editor ────────────────────────────────────────── */}
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-30 relative shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              proyectoId
                ? navigate(`/dashboard/proyectos/${proyectoId}/diagramas`)
                : navigate(-1)
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Volver a los diagramas"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30 shadow-inner">
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide truncate max-w-[180px] sm:max-w-[280px]">
                  {nombreDiagrama}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v{versionRegistro}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                <span>{nodes.filter((n) => n.type === 'claseNode').length} clases</span>
                <span>•</span>
                <span>{nodes.filter((n) => n.type === 'notaNode').length} notas</span>
                <span>•</span>
                <span>{edges.length} relaciones</span>
              </p>
            </div>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5">
          {/* Indicador de Estado WebSocket (CU-12) */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${socketConectado
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            title={
              socketConectado
                ? `Conectado a la sala colaborativa /topic/diagrama/${diagramaId}`
                : 'Conectando al servidor WebSocket...'
            }
          >
            <span className="relative flex h-2 w-2">
              {socketConectado ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse"></span>
              )}
            </span>
            <span className="hidden sm:inline font-mono text-[11px]">
              {socketConectado ? 'Modo Colaborativo' : 'Conectando...'}
            </span>
          </div>

          {/* Botón Compartir / Sesión Colaborativa (CU-11) */}
          <button
            id="btn-compartir-sesion"
            onClick={handleCompartirSesion}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-indigo-500/40"
            title="Generar y copiar enlace de sesión colaborativa (CU-11)"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Compartir / Sesión Colaborativa</span>
            <span className="inline md:hidden">Compartir</span>
          </button>

          <button
            onClick={cargarDiagrama}
            disabled={cargando || guardando}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
            title="Recargar diagrama del servidor"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>

          {/* CU-19: Generar Backend Spring Boot */}
          <button
            id="btn-generar-springboot"
            onClick={handleGenerarCodigo}
            disabled={generandoCodigo || cargando}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
            title="Compilar diagrama a proyecto Spring Boot (.zip)"
          >
            {generandoCodigo ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {generandoCodigo ? 'Compilando...' : 'Generar Backend'}
            </span>
          </button>

          <button
            id="btn-guardar-lienzo"
            onClick={guardarLienzo}
            disabled={guardando || cargando}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
          >
            {guardando ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </header>

      {/* ── Banners Notificaciones Flotantes ─────────────────────────── */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-none">
        {errorAlerta && (
          <div className="pointer-events-auto p-4 bg-red-950/90 border-2 border-red-500/50 rounded-2xl shadow-2xl backdrop-blur-md text-red-200 text-xs flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">
                  Conflicto de Concurrencia Detectado (HTTP 409)
                </span>
                <p className="leading-relaxed">{errorAlerta}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={cargarDiagrama}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Recargar y Actualizar Lienzo</span>
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setErrorAlerta(null)}
              className="text-red-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {mensajeExito && (
          <div className="pointer-events-auto p-3.5 bg-emerald-950/90 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-md text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{mensajeExito}</span>
            </div>
            <button
              onClick={() => setMensajeExito(null)}
              className="text-emerald-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {mensajeColaborativo && (
          <div className="pointer-events-auto p-3.5 bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-md text-slate-200 text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span className="font-medium text-white">{mensajeColaborativo}</span>
            </div>
            <button
              onClick={() => setMensajeColaborativo(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Toolbar Lateral Izquierdo ────────────────────────────────── */}
      <div className="absolute left-4 top-20 z-20 flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl">
        {/* Botón Agregar Clase (CU-07) */}
        <button
          id="btn-agregar-clase"
          onClick={abrirModalNuevaClase}
          className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 hover:text-indigo-300 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 group"
          title="Agregar nueva Clase UML"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-sans font-bold">Clase</span>
        </button>

        {/* Botón Agregar Nota (CU-10) */}
        <button
          id="btn-agregar-nota"
          onClick={handleAgregarNota}
          className="p-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 group"
          title="Agregar Nota Adhesiva / Comentario"
        >
          <StickyNote className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-sans font-bold">Nota</span>
        </button>

        <div className="h-px bg-white/10 my-0.5" />

        <button
          onClick={guardarLienzo}
          disabled={guardando}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 group"
          title="Guardar estado del lienzo"
        >
          <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-sans font-bold">Guardar</span>
        </button>

        <button
          onClick={cargarDiagrama}
          disabled={cargando}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 group"
          title="Sincronizar con servidor"
        >
          <RefreshCw
            className={`w-5 h-5 ${cargando ? 'animate-spin' : 'group-hover:rotate-45'} transition-transform`}
          />
          <span className="text-[9px] font-sans font-bold">Sync</span>
        </button>

        <div className="h-px bg-white/10 my-0.5" />

        {/* Botón Exportar XMI (CU-17) */}
        <button
          id="btn-exportar-xmi"
          onClick={handleExportarXmi}
          disabled={exportandoXmi || cargando}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 group disabled:opacity-50"
          title="Exportar a XMI 2.1 (Enterprise Architect)"
        >
          {exportandoXmi ? (
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          ) : (
            <Download className="w-5 h-5 group-hover:scale-110 transition-transform text-cyan-400" />
          )}
          <span className="text-[9px] font-sans font-bold">Exp XMI</span>
        </button>

        {/* Botón Importar XMI (CU-17) */}
        <button
          id="btn-importar-xmi"
          onClick={() => fileInputXmiRef.current?.click()}
          disabled={importandoXmi || cargando}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 group disabled:opacity-50"
          title="Importar archivo XMI/XML (Enterprise Architect)"
        >
          {importandoXmi ? (
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          ) : (
            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform text-emerald-400" />
          )}
          <span className="text-[9px] font-sans font-bold">Imp XMI</span>
        </button>

        {/* Input oculto para carga de archivos .xml/.xmi */}
        <input
          type="file"
          ref={fileInputXmiRef}
          onChange={handleImportarXmi}
          accept=".xml,.xmi"
          className="hidden"
        />
      </div>

      {/* ── Contenedor de React Flow ─────────────────────────────────── */}
      <main
        ref={mainContainerRef}
        onPointerMove={handlePointerMove}
        className="flex-1 w-full h-full relative overflow-hidden"
      >
        {cargando && nodes.length === 0 ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-300">Cargando lienzo UML...</p>
          </div>
        ) : null}

        {/* ── Capa de Cursores Remotos en Vivo (CU-14) ────────────────── */}
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          {Object.entries(cursores).map(([uId, cursor]) => (
            <div
              key={uId}
              className="absolute top-0 left-0 transition-transform duration-75 ease-out flex flex-col items-start select-none will-change-transform"
              style={{
                transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
              }}
            >
              <MousePointer2
                className="w-5 h-5 drop-shadow-md"
                style={{
                  color: cursor.color,
                  fill: cursor.color,
                }}
              />
              <div
                className="px-2 py-0.5 mt-0.5 ml-3 rounded-md text-[10px] font-bold text-white shadow-xl whitespace-nowrap border border-white/20 flex items-center gap-1"
                style={{
                  backgroundColor: cursor.color,
                }}
              >
                <span>{cursor.nombre}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Badges Flotantes de Nodos Bloqueados (CU-13) ─────────────── */}
        {Object.entries(nodosBloqueados).map(([nId, bloqueo]) => {
          if (bloqueo.usuarioId === (usuario?.id || 'anonimo')) return null;
          const targetNode = nodes.find((n) => n.id === nId);
          if (!targetNode) return null;

          return (
            <div
              key={`lock_badge_${nId}`}
              className="pointer-events-none absolute z-20 transition-all duration-150"
              style={{
                left: `${targetNode.position.x}px`,
                top: `${targetNode.position.y - 26}px`,
              }}
            >
              <div
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xl flex items-center gap-1.5 border border-white/20 animate-pulse"
                style={{ backgroundColor: bloqueo.color }}
              >
                <Lock className="w-3 h-3" />
                <span>Editando: {bloqueo.nombre}</span>
              </div>
            </div>
          );
        })}

        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          connectionRadius={40}
          isValidConnection={isValidConnection}
          defaultEdgeOptions={{
            type: 'relacionEdge',
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#334155"
          />
          <Controls />
        </ReactFlow>

        {/* ── Panel Lateral Derecho: Propiedades de la Relación ───────── */}
        {selectedEdge && (
          <aside className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-white/10 z-20 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Propiedades de la Relación
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEliminarRelacion}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar relación"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedEdgeId(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Conexión UML
                </span>
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <div className="px-2.5 py-1.5 bg-slate-900 rounded-lg border border-white/10 text-slate-300 font-semibold truncate max-w-[120px]">
                    {sourceNode?.data?.nombre || 'Origen'}
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  {selectedEdge.data?.tipoRelacion === 'CLASE_ASOCIACION' ? (
                    <div
                      className="px-2.5 py-1.5 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 rounded-lg font-semibold truncate max-w-[140px]"
                      title={
                        selectedEdge.data?.edgeBaseId
                          ? (() => {
                            const bEdge = edges.find((e) => e.id === selectedEdge.data?.edgeBaseId);
                            const bSrc = bEdge ? nodes.find((n) => n.id === bEdge.source) : null;
                            const bTgt = bEdge ? nodes.find((n) => n.id === bEdge.target) : null;
                            return bSrc && bTgt
                              ? `Relación Base: ${bSrc.data?.nombre || 'Origen'} ↔ ${bTgt.data?.nombre || 'Destino'}`
                              : 'Relación Base';
                          })()
                          : 'Relación Base'
                      }
                    >
                      Relación Base
                    </div>
                  ) : (
                    <div className="px-2.5 py-1.5 bg-slate-900 rounded-lg border border-white/10 text-slate-300 font-semibold truncate max-w-[120px]">
                      {targetNode?.data?.nombre || 'Destino'}
                    </div>
                  )}
                </div>
              </div>

              {/* Nombre de la Relación (Etiqueta al 50% de la línea) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Nombre / Rol de la Relación
                </label>
                <input
                  type="text"
                  value={selectedEdge.data?.nombre || ''}
                  onChange={(e) => handleCambiarNombreRelacion(e.target.value)}
                  placeholder="Ej. contiene, gestiona, hereda de"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Tipo de Relación UML
                </label>
                <select
                  value={selectedEdge.data?.tipoRelacion || 'ASOCIACION'}
                  onChange={(e) => handleCambiarTipoRelacion(e.target.value as TipoRelacionUml)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ASOCIACION">Asociación Simple (Flecha abierta)</option>
                  <option value="CLASE_ASOCIACION">Clase de Asociación (Línea punteada)</option>
                  <option value="DEPENDENCIA">Dependencia / Realización (Línea punteada)</option>
                  <option value="HERENCIA">Herencia / Generalización (Triángulo vacío)</option>
                  <option value="AGREGACION">Agregación (Diamante vacío)</option>
                  <option value="COMPOSICION">Composición (Diamante relleno)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Multiplicidad Origen
                  </label>
                  <select
                    value={selectedEdge.data?.multiplicidadOrigen ?? ''}
                    onChange={(e) => handleCambiarMultiplicidadOrigen(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {OPCIONES_MULTIPLICIDAD.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion === '' ? '<Ninguna>' : opcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Multiplicidad Destino
                  </label>
                  <select
                    value={selectedEdge.data?.multiplicidadDestino ?? ''}
                    onChange={(e) => handleCambiarMultiplicidadDestino(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {OPCIONES_MULTIPLICIDAD.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion === '' ? '<Ninguna>' : opcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={handleEliminarRelacion}
                  className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Relación</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ── Panel Lateral Derecho: Propiedades de la Nota (CU-10) ───── */}
        {selectedNode && selectedNode.type === 'notaNode' && (
          <aside className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-white/10 z-20 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Propiedades de la Nota (CU-10)
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEliminarNodo}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar nota del lienzo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Textarea Grande para el Texto de la Nota */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  <AlignLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>Texto de la Anotación</span>
                </label>
                <textarea
                  rows={6}
                  value={selectedNode.data?.texto || ''}
                  onChange={(e) => handleCambiarTextoNota(e.target.value)}
                  placeholder="Escribe aquí las observaciones arquitectónicas, patrones de diseño o notas para el equipo..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/80 transition-all font-sans leading-relaxed resize-none"
                />
              </div>

              {/* Paleta de Colores de Fondo */}
              <div className="space-y-2.5 pt-3 border-t border-white/5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Color de Fondo</span>
                </label>
                <div className="flex items-center gap-3">
                  {PALETA_COLORES_NOTA.map((color) => {
                    const isSelected =
                      (selectedNode.data?.colorFondo || '#fef08a').toLowerCase() ===
                      color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => handleCambiarColorFondoNota(color.hex)}
                        className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer shadow-md ${isSelected
                          ? 'border-white scale-110 ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900'
                          : 'border-white/20 hover:scale-105'
                          }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.nombre}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Botón de Eliminar */}
              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={handleEliminarNodo}
                  className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Nota</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ── Panel Lateral Derecho: Propiedades del Anchor (Relación M:N) ─── */}
        {selectedNode && selectedNode.type === 'anchorNode' && (
          <aside className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-white/10 z-20 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Etiqueta de Relación M:N
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEliminarNodo}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar etiqueta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Texto de la Relación
                </label>
                <input
                  type="text"
                  value={selectedNode.data?.nombre || ''}
                  onChange={(e) => {
                    const nuevo = e.target.value;
                    setNodes((nds) => {
                      const nextNodes = nds.map((n) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, nombre: nuevo } }
                          : n
                      );
                      broadcastLienzoState('FULL_NODES', nextNodes);
                      return nextNodes;
                    });
                  }}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Nombre de relación (ej. gestiona, asocia)"
                />
              </div>
            </div>
          </aside>
        )}

        {/* ── Panel Lateral Derecho: Propiedades de la Clase (CU-08) ─── */}
        {selectedNode && selectedNode.type === 'claseNode' && (
          <aside className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-white/10 z-20 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Propiedades de la Clase
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEliminarNodo}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar clase del lienzo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Nombre de la Clase */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre de la Clase
                </label>
                <div className="relative">
                  <Box className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={selectedNode.data.nombre}
                    onChange={(e) => handleCambiarNombreClase(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* ── SECCIÓN: ATRIBUTOS (CU-08) ────────────────────────── */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Atributos ({selectedNode.data.atributos?.length || 0})</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedNode.data.atributos && selectedNode.data.atributos.length > 0 ? (
                    selectedNode.data.atributos.map((attr: AtributoUml) => (
                      <div
                        key={attr.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-white/5 text-xs font-mono group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={
                              attr.visibilidad === '+'
                                ? 'text-emerald-400 font-bold'
                                : attr.visibilidad === '-'
                                  ? 'text-rose-400 font-bold'
                                  : 'text-amber-400 font-bold'
                            }
                          >
                            {attr.visibilidad}
                          </span>
                          <span className="text-white font-medium truncate">{attr.nombre}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-slate-500 text-[10px]">:</span>
                            <select
                              value={attr.tipoDato || '<none>'}
                              onChange={(e) => handleEditarTipoAtributo(attr.id, e.target.value)}
                              className="bg-transparent text-slate-400 text-[10px] focus:outline-none cursor-pointer hover:text-white"
                            >
                              {TIPOS_DATO_ATRIBUTO.map((tipo) => (
                                <option key={tipo} value={tipo} className="bg-slate-900 text-slate-200">
                                  {tipo}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEliminarAtributo(attr.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                          title="Eliminar atributo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic p-2 bg-slate-950/30 rounded-lg">
                      No hay atributos definidos.
                    </p>
                  )}
                </div>

                <form
                  onSubmit={handleAgregarAtributo}
                  className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-2.5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nuevo Atributo
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <select
                        value={attrVisibilidad}
                        onChange={(e) => setAttrVisibilidad(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="+">+ (public)</option>
                        <option value="-">- (private)</option>
                        <option value="#"># (protected)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <select
                        value={attrTipoDato}
                        onChange={(e) => setAttrTipoDato(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {TIPOS_DATO_ATRIBUTO.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    value={attrNombre}
                    onChange={(e) => setAttrNombre(e.target.value)}
                    placeholder="Nombre atributo (ej. email)"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Atributo</span>
                  </button>
                </form>
              </div>

              {/* ── SECCIÓN: MÉTODOS (CU-08) ──────────────────────────── */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Métodos ({selectedNode.data.metodos?.length || 0})</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedNode.data.metodos && selectedNode.data.metodos.length > 0 ? (
                    selectedNode.data.metodos.map((met: MetodoUml) => (
                      <div
                        key={met.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-white/5 text-xs font-mono group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={
                              met.visibilidad === '+'
                                ? 'text-emerald-400 font-bold'
                                : met.visibilidad === '-'
                                  ? 'text-rose-400 font-bold'
                                  : 'text-amber-400 font-bold'
                            }
                          >
                            {met.visibilidad}
                          </span>
                          <span className="text-slate-200 font-medium truncate">{met.nombre}()</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-slate-500 text-[10px]">:</span>
                            <select
                              value={met.tipoRetorno || '<none>'}
                              onChange={(e) => handleEditarTipoMetodo(met.id, e.target.value)}
                              className="bg-transparent text-slate-400 text-[10px] focus:outline-none cursor-pointer hover:text-white"
                            >
                              {TIPOS_RETORNO_METODO.map((tipo) => (
                                <option key={tipo} value={tipo} className="bg-slate-900 text-slate-200">
                                  {tipo}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEliminarMetodo(met.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                          title="Eliminar método"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic p-2 bg-slate-950/30 rounded-lg">
                      No hay métodos definidos.
                    </p>
                  )}
                </div>

                <form
                  onSubmit={handleAgregarMetodo}
                  className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-2.5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nuevo Método
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <select
                        value={metVisibilidad}
                        onChange={(e) => setMetVisibilidad(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="+">+ (public)</option>
                        <option value="-">- (private)</option>
                        <option value="#"># (protected)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <select
                        value={metTipoRetorno}
                        onChange={(e) => setMetTipoRetorno(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {TIPOS_RETORNO_METODO.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    value={metNombre}
                    onChange={(e) => setMetNombre(e.target.value)}
                    placeholder="Nombre método (ej. procesarPago)"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Método</span>
                  </button>
                </form>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* ── Modal: Crear Clase UML (CU-07) ──────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nueva Clase UML</h3>
                  <p className="text-xs text-slate-400">Agregar al lienzo</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearClase} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Clase
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nombreNuevaClase}
                  onChange={(e) => setNombreNuevaClase(e.target.value)}
                  placeholder="Ej. Usuario, Producto, Pedido"
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Clase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Panel Flotante de Chat y Voz con IA (CU-15) ───────────────── */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {chatIaAbierto ? (
          <div className="w-80 sm:w-96 h-[440px] bg-slate-900/95 backdrop-blur-md border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header del Chat */}
            <div className="p-3.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Copiloto UML (NLP & Voz)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                    Modelo Local Activo
                  </span>
                </div>
              </div>
              <button
                onClick={() => setChatIaAbierto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Minimizar chat"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Mensajes */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs"
            >
              {mensajesIa.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.remitente === 'usuario' ? 'items-end' : 'items-start'
                    }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl ${msg.remitente === 'usuario'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800/90 text-slate-200 rounded-bl-none border border-white/10'
                      }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.texto}</p>
                    {msg.accion && (
                      <span className="mt-1.5 inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/10 text-indigo-300 border border-white/10">
                        Acción: {msg.accion}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                    {msg.hora}
                  </span>
                </div>
              ))}

              {procesandoIa && (
                <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/40 p-2 rounded-xl border border-white/5 w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>Interpretando comando NLP...</span>
                </div>
              )}
            </div>

            {/* Input y Control de Voz */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarComandoIa();
              }}
              className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleGrabacionVoz}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${grabandoVoz
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-white/10 hover:bg-slate-700'
                  }`}
                title={grabandoVoz ? 'Detener dictado' : 'Dictar por voz'}
              >
                {grabandoVoz ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-indigo-400" />
                )}
              </button>

              <input
                type="text"
                value={inputComandoIa}
                onChange={(e) => setInputComandoIa(e.target.value)}
                placeholder={
                  grabandoVoz
                    ? 'Escuchando tu voz...'
                    : 'Escribe ej. crear clase Factura...'
                }
                className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
              />

              <button
                type="submit"
                disabled={!inputComandoIa.trim() || procesandoIa}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-600/20"
                title="Enviar comando"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setChatIaAbierto(true)}
            className="group px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 border border-white/20 cursor-pointer"
            title="Abrir Copiloto IA (Modelado por voz y chat)"
          >
            <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold tracking-wide">Copiloto IA </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorUmlPage;
