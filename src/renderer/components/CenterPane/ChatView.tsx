import * as React from 'react';
import { useRef, useEffect } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { Icon } from '../Icon';

export function ChatView() {
  const { state, dispatch } = useAppState();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = React.useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [state.chatMessages]);

  // Listen for streaming chunks from main process
  useEffect(() => {
    const cleanupChunk = window.electronAPI.copilot.onChunk((messageId, content) => {
      dispatch({ type: 'APPEND_CHAT_CHUNK', payload: { messageId, content } });
    });

    const cleanupDone = window.electronAPI.copilot.onDone(() => {
      dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: false } });
    });

    const cleanupError = window.electronAPI.copilot.onError((messageId, error) => {
      dispatch({ type: 'APPEND_CHAT_CHUNK', payload: { messageId, content: `Error: ${error}` } });
      dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: false } });
    });

    return () => {
      cleanupChunk();
      cleanupDone();
      cleanupError();
    };
  }, [dispatch]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || state.chatLoading) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { message: userMessage } });
    setInputValue('');

    // Create placeholder assistant message for streaming
    const assistantMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { message: assistantMessage } });
    dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: true } });

    // Send to main process via IPC
    window.electronAPI.copilot.send(content, assistantMessage.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Stop propagation to prevent global shortcuts from firing
    e.stopPropagation();

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {state.chatMessages.length === 0 ? (
          <div className="chat-empty">
            <Icon name="copilot" size={48} />
            <p>Start a conversation with Copilot</p>
          </div>
        ) : (
          state.chatMessages.map(msg => (
            <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
              <div className="chat-message-content">
                {msg.content || (msg.role === 'assistant' && state.chatLoading ? '...' : '')}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Copilot..."
          disabled={state.chatLoading}
          rows={1}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim() || state.chatLoading}
          title="Send message"
        >
          <Icon name="chevron-right" size="sm" />
        </button>
      </div>
    </div>
  );
}
