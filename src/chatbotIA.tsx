import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, User, Bot, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { authAPI, UserData } from './config/api';
import './Chatbot.css'; // Importar el archivo CSS

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

// Actualizada la interfaz para incluir todas las props que necesitas
interface ChatbotProps {
  className?: string;
  user?: UserData;  // Hacer opcional ya que el componente puede obtenerlo internamente
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
        
        // Si se pasó user como prop, usarlo; sino obtenerlo de la API
        if (propUser) {
          userData = propUser;
          setUser(userData);
        } else {
          const response = await authAPI.getCurrentUser();
          userData = response.data;
          setUser(userData);
        }

        // Verificar si es maestro o directivo
        if (userData.es_maestro || userData.es_directivo) {
          setIsAuthorized(true);
          // Mensaje de bienvenida
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

  // Auto-scroll a los mensajes más recientes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Función para llamar a la API de DeepSeek
  const callDeepSeekAPI = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages: [
            {
              role: 'system',
              content: 'Estamos en un jardín maternal, así que debes responder como si te estuvieran consultando cosas propias de un jardín maternal. Eres un asistente especializado en educación inicial, desarrollo infantil, actividades pedagógicas, manejo de grupo y comunicación con padres. Responde siempre en español de manera profesional pero amigable.'
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta en este momento.';
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      return 'Lo siento, hubo un problema al conectar con el servicio. Por favor, intenta nuevamente.';
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
      {/* Si hay onBack, mostrar como página completa */}
      {onBack ? (
        <div className="chatbot-fullscreen" style={{ padding: '1rem' }}>
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            {/* Header con botón de volver */}
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

            {/* Chat container para página completa */}
            <div className="chatbot-container">
              {/* Área de mensajes */}
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

              {/* Área de input */}
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
        // Versión flotante original
        <>
          {/* Botón flotante para abrir/cerrar el chat */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="chatbot-float-btn"
          >
            <MessageCircle size={24} />
          </button>

          {/* Ventana del chat */}
          {isOpen && (
            <div className="chatbot-window">
              {/* Header */}
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

              {/* Área de mensajes */}
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

              {/* Área de input */}
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