import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, User, Bot, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { authAPI, UserData } from './config/api';
import './Chatbot.css';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
  user?: UserData;
  onBack?: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ className = '', user: propUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(propUser || null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Verificar autorización del usuario
  useEffect(() => {
    const checkUserAuthorization = async () => {
      try {
        let userData: UserData;
        
        if (propUser) {
          userData = propUser;
          setUser(userData);
        } else {
          const response = await authAPI.getCurrentUser();
          userData = response.data;
          setUser(userData);
        }

        if (userData.es_maestro || userData.es_directivo) {
          setIsAuthorized(true);
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            content: `¡Hola ${userData.first_name}! Soy tu asistente del jardín maternal. Puedo ayudarte con consultas sobre educación inicial, desarrollo infantil, actividades pedagógicas, manejo de grupo, comunicación con padres y todo lo relacionado con nuestro jardín. ¿En qué puedo ayudarte hoy?`,
            role: 'assistant',
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        } else {
          setAuthError('Solo los maestros y directivos pueden acceder al chatbot del jardín maternal.');
        }
      } catch (error) {
        setAuthError('Error al verificar permisos. Por favor, inicia sesión nuevamente.');
      }
    };

    checkUserAuthorization();
  }, [propUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Función mejorada para llamar a la API
  const callDeepSeekAPI = async (userMessage: string): Promise<string> => {
    try {
      // Diferentes formas de obtener la API key
      let API_KEY: string | undefined;
      
      // Método 1: process.env (si está disponible)
      try {
        API_KEY = process?.env?.REACT_APP_OPENROUTER_API_KEY;
      } catch (e) {
        console.log('process.env no disponible, usando método alternativo');
      }
      
      // Método 2: desde window (si está configurado)
      if (!API_KEY && typeof window !== 'undefined') {
        API_KEY = (window as any).REACT_APP_OPENROUTER_API_KEY;
      }
      
      // Método 3: Fallback temporal - REEMPLAZA CON TU API KEY
      if (!API_KEY) {
        API_KEY = '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';
      }

      if (!API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
        throw new Error('API Key no configurada correctamente');
      }

      console.log('API Key found:', API_KEY ? '✓' : '✗'); // Para debugging

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': window.location.origin, // Opcional: para identificar tu app
          'X-Title': 'Jardín Maternal Chatbot', // Opcional: nombre de tu app
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',  // Removido :free - prueba sin el sufijo
          messages: [
            {
              role: 'system',
              content: `Eres un asistente especializado en educación inicial y jardín maternal. 
              Tu audiencia son maestros y directivos de jardín maternal. 
              Proporciona respuestas profesionales pero amigables sobre:
              - Desarrollo infantil temprano (0-5 años)
              - Actividades pedagógicas apropiadas para la edad
              - Estrategias de manejo de grupo
              - Comunicación efectiva con padres
              - Planificación de actividades educativas
              - Resolución de conflictos en el aula
              - Estimulación temprana y juego educativo
              
              Siempre responde en español y mantén un tono profesional pero cálido.
              Si la consulta no está relacionada con educación inicial, redirige amablemente hacia temas del jardín maternal.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 401) {
          throw new Error('API Key inválida o expirada. Verifica tu configuración.');
        } else if (response.status === 402) {
          throw new Error('Créditos insuficientes en tu cuenta de OpenRouter.');
        } else if (response.status === 429) {
          throw new Error('Límite de rate excedido. Intenta nuevamente en unos minutos.');
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Respuesta inválida de la API');
      }

      return data.choices[0].message.content || 
             'Lo siento, no pude generar una respuesta en este momento.';
             
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      
      if (error instanceof Error) {
        // Errores específicos que podemos manejar
        if (error.message.includes('API Key')) {
          return 'Error de configuración: La API Key no es válida. Contacta al administrador del sistema.';
        } else if (error.message.includes('Créditos')) {
          return 'Sin créditos disponibles. Contacta al administrador del sistema.';
        } else if (error.message.includes('rate')) {
          return 'Demasiadas consultas. Por favor, espera unos minutos antes de intentar nuevamente.';
        }
      }
      
      return 'Lo siento, hubo un problema al conectar con el servicio de IA. Por favor, intenta nuevamente en unos momentos.';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await callDeepSeekAPI(userMessage.content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta nuevamente.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isAuthorized) {
    return (
      <div className={`${className}`} style={{ padding: '1.5rem' }}>
        <div className="chatbot-error-container">
          <div className="chatbot-error-content">
            <AlertCircle className="chatbot-error-icon" size={24} />
            <div className="chatbot-error-text">
              <h3>Acceso Restringido</h3>
              <p>
                {authError || 'Solo los maestros y directivos pueden acceder al chatbot del jardín maternal.'}
              </p>
              {onBack && (
                <button onClick={onBack} className="chatbot-error-back">
                  <ArrowLeft size={16} />
                  <span>Volver</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {onBack ? (
        <div className="chatbot-fullscreen" style={{ padding: '1rem' }}>
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            <div className="chatbot-header">
              <div className="chatbot-header-content">
                <div className="chatbot-nav">
                  <button onClick={onBack} className="chatbot-back-btn">
                    <ArrowLeft size={20} />
                    <span>Volver</span>
                  </button>
                  <div className="chatbot-title-section">
                    <Bot className="chatbot-title-icon" size={24} />
                    <h1 className="chatbot-title">Asistente IA - Jardín Maternal</h1>
                  </div>
                </div>
                {user && (
                  <div className="chatbot-user-info">
                    {user.first_name} {user.last_name}
                  </div>
                )}
              </div>
            </div>

            <div className="chatbot-container">
              <div className="chatbot-messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-wrapper ${message.role}`}
                  >
                    <div className={`message-bubble ${message.role}`}>
                      <div className="message-content">
                        {message.role === 'assistant' && (
                          <Bot className="message-icon" />
                        )}
                        {message.role === 'user' && (
                          <User className="message-icon" style={{ order: 2 }} />
                        )}
                        <div style={message.role === 'user' ? { order: 1 } : {}}>
                          <p className="message-text">{message.content}</p>
                          <p className="message-time">
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="loading-message">
                    <div className="loading-bubble">
                      <div className="loading-content">
                        <Bot size={16} />
                        <Loader2 className="loading-spinner" size={16} />
                        <span style={{ fontSize: '0.875rem' }}>Escribiendo...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chatbot-input-area">
                <div className="chatbot-input-container">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu consulta sobre el jardín maternal..."
                    className="chatbot-textarea"
                    rows={3}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="chatbot-send-btn"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="chatbot-float-btn"
          >
            <MessageCircle size={24} />
          </button>

          {isOpen && (
            <div className="chatbot-window">
              <div className="chatbot-window-header">
                <div className="chatbot-window-header-content">
                  <div className="chatbot-window-title">
                    <Bot size={20} />
                    <h3>Asistente Jardín Maternal</h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="chatbot-close-btn"
                  >
                    ×
                  </button>
                </div>
                {user && (
                  <p className="chatbot-window-user">
                    Conectado como: {user.first_name} {user.last_name}
                  </p>
                )}
              </div>

              <div className="chatbot-messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-wrapper ${message.role}`}
                  >
                    <div className={`message-bubble ${message.role}`}>
                      <div className="message-content">
                        {message.role === 'assistant' && (
                          <Bot className="message-icon" />
                        )}
                        {message.role === 'user' && (
                          <User className="message-icon" style={{ order: 2 }} />
                        )}
                        <div style={message.role === 'user' ? { order: 1 } : {}}>
                          <p className="message-text">{message.content}</p>
                          <p className="message-time">
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="loading-message">
                    <div className="loading-bubble">
                      <div className="loading-content">
                        <Bot size={16} />
                        <Loader2 className="loading-spinner" size={16} />
                        <span style={{ fontSize: '0.875rem' }}>Escribiendo...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chatbot-input-area">
                <div className="chatbot-input-container">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu consulta sobre el jardín maternal..."
                    className="chatbot-textarea"
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="chatbot-send-btn"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Chatbot;