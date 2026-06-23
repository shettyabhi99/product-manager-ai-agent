import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Code, FileText, Bot, ListTodo, Presentation, Route, Plus } from 'lucide-react';
import { processQuery, type Message } from './api/agent';
import { motion, AnimatePresence } from 'framer-motion';

const CAPABILITY_TEMPLATES = {
  prd: `Generate a PRD for a new "Dark Mode" feature for an e-commerce mobile app. The primary target audience is night shoppers, and the goals are to reduce eye strain and increase session duration by 15%. Include sections for Problem Statement, User Personas, Functional Requirements, and Success Metrics.`,
  
  prioritize: `Prioritize the following backlog items using the RICE framework (Reach, Impact, Confidence, Effort). Provide a prioritized list with a detailed markdown table showing the calculated RICE scores:
1. Add Google Pay integration (High reach, high impact, moderate effort).
2. Redesign the user profile screen (Low impact, high effort, high confidence).
3. Implement automatic password reset via SMS (High reach, moderate impact, low effort).
4. Build a custom recommendation engine (High impact, very high effort, low confidence).`,

  summarize: `Summarize this transcript from our team sync:
Alex: "We need to launch the beta for the recommendation engine by Friday. Jessica, are the API endpoints ready?"
Jessica: "Yes, they are deployed on staging. But I still need to optimize the database queries for heavy loads. I'll finish that by Wednesday."
Dave: "Great. I'll start integrating the front-end UI components tomorrow. We should also write unit tests."
Alex: "Let's align on QA. Dave, please coordinate with Sarah on Thursday for sanity testing."`,

  analyze: `Analyze competitors for a new SaaS project management tool targeting remote creative agencies. Compare it against Trello and Asana. Look at feature sets, target audience, pricing tiers, and identify a unique value proposition (UVP) for our tool.`,

  roadmap: `Build a 6-month roadmap for a food delivery startup looking to expand into grocery delivery. The milestones are: grocery partner onboarding, inventory sync system, UI update for app checkout, and pilot launch. Organize it by quarters (Q3 and Q4).`
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const submitMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const agentMessageId = (Date.now() + 1).toString();
    
    // Create an initial empty agent message
    setMessages(prev => [...prev, {
      id: agentMessageId,
      role: 'agent',
      content: '',
    }]);

    await processQuery(userMessage.content, (update) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === agentMessageId) {
          return { ...msg, ...update };
        }
        return msg;
      }));
    });

    setIsTyping(false);
  };

  const handleSend = () => submitMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateClick = (type: keyof typeof CAPABILITY_TEMPLATES) => {
    setInput(CAPABILITY_TEMPLATES[type]);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar glass-panel">
        <div className="brand">
          <Bot size={32} className="brand-icon" />
          <span className="brand-text">PM Agent</span>
        </div>

        <button 
          className="new-chat-btn" 
          onClick={() => {
            setMessages([]);
            setInput('');
          }}
          title="Reset and start a new workflow"
        >
          <Plus size={16} /> New Chat
        </button>
        
        <div className="nav-section">
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', marginTop: '20px' }}>Capabilities</h4>
          <div className="nav-item" onClick={() => handleTemplateClick('prd')} title="Load PRD Generator template"><FileText size={18} /> PRD Generator</div>
          <div className="nav-item" onClick={() => handleTemplateClick('prioritize')} title="Load Backlog Prioritizer template"><ListTodo size={18} /> Backlog Prioritizer</div>
          <div className="nav-item" onClick={() => handleTemplateClick('summarize')} title="Load Meeting Summarizer template"><Presentation size={18} /> Meeting Summarizer</div>
          <div className="nav-item" onClick={() => handleTemplateClick('analyze')} title="Load Competitor Analyzer template"><Code size={18} /> Competitor Analyzer</div>
          <div className="nav-item" onClick={() => handleTemplateClick('roadmap')} title="Load Roadmap Builder template"><Route size={18} /> Roadmap Builder</div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-content">
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="dashboard-container">
              <div className="dashboard-header">
                <Bot size={54} className="dashboard-bot-icon animate-pulse" />
                <h1>OpenClaw PM Copilot</h1>
                <p>Equipped with specialized workflows for senior product managers. Click any template card below to load a high-quality example prompt.</p>
              </div>

              <div className="dashboard-section-title">💡 Prompting Best Practices</div>
              <div className="best-practices-grid">
                <div className="best-practice-card glass-panel">
                  <div className="bp-icon">🎯</div>
                  <div className="bp-body">
                    <h3>Be Specific</h3>
                    <p>Provide platform info (iOS/Android/Web), target audience, and current constraints.</p>
                  </div>
                </div>
                <div className="best-practice-card glass-panel">
                  <div className="bp-icon">📊</div>
                  <div className="bp-body">
                    <h3>Define Success metrics</h3>
                    <p>Explicitly request specific goals (e.g. increase click-through rate, reduce checkout churn).</p>
                  </div>
                </div>
                <div className="best-practice-card glass-panel">
                  <div className="bp-icon">📝</div>
                  <div className="bp-body">
                    <h3>Provide Raw Data</h3>
                    <p>Paste raw, unstructured text (like meeting notes or competitive features) for structured summarization.</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-section-title">🚀 Quick Start Templates</div>
              <div className="templates-grid">
                <div 
                  className="template-card glass-panel" 
                  onClick={() => handleTemplateClick('prd')} 
                  title="Generate a comprehensive, standard PRD layout"
                >
                  <div className="tc-header">
                    <FileText size={20} className="tc-icon" />
                    <h3>PRD Generator</h3>
                  </div>
                  <p>Create detailed product requirements including user stories, functional requirements, and success KPIs.</p>
                  <span className="click-to-use">Use template →</span>
                </div>

                <div 
                  className="template-card glass-panel" 
                  onClick={() => handleTemplateClick('prioritize')} 
                  title="Prioritize backlog using Reach, Impact, Confidence, and Effort"
                >
                  <div className="tc-header">
                    <ListTodo size={20} className="tc-icon" />
                    <h3>Backlog Prioritizer</h3>
                  </div>
                  <p>Generate a RICE prioritization matrix to clarify high-leverage product decisions.</p>
                  <span className="click-to-use">Use template →</span>
                </div>

                <div 
                  className="template-card glass-panel" 
                  onClick={() => handleTemplateClick('summarize')} 
                  title="Extract action items and key decisions from transcript dialogs"
                >
                  <div className="tc-header">
                    <Presentation size={20} className="tc-icon" />
                    <h3>Meeting Summarizer</h3>
                  </div>
                  <p>Transform transcripts into dynamic executive summaries, action item logs, and owner assignments.</p>
                  <span className="click-to-use">Use template →</span>
                </div>

                <div 
                  className="template-card glass-panel" 
                  onClick={() => handleTemplateClick('analyze')} 
                  title="Analyze competitors side-by-side with market gaps"
                >
                  <div className="tc-header">
                    <Code size={20} className="tc-icon" />
                    <h3>Competitor Analyzer</h3>
                  </div>
                  <p>Formulate competitive analysis tables comparing features, pricing, target audiences, and UVPs.</p>
                  <span className="click-to-use">Use template →</span>
                </div>

                <div 
                  className="template-card glass-panel" 
                  onClick={() => handleTemplateClick('roadmap')} 
                  title="Build structured timelines with Q3/Q4 deliverables"
                >
                  <div className="tc-header">
                    <Route size={20} className="tc-icon" />
                    <h3>Roadmap Builder</h3>
                  </div>
                  <p>Map high-level milestones, timelines, and launch phases across quarters (e.g. Q3/Q4).</p>
                  <span className="click-to-use">Use template →</span>
                </div>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`message-row ${msg.role}`}
                >
                  <div className="message-bubble">
                    {msg.toolCall && (
                      <div className="tool-status">
                        {msg.toolCall.status === 'running' ? (
                          <Loader2 size={16} className="spinner" />
                        ) : (
                          <Bot size={16} />
                        )}
                        <span>
                          {msg.toolCall.status === 'running' 
                            ? `Running skill: ${msg.toolCall.name}...` 
                            : `Skill executed: ${msg.toolCall.name}`}
                        </span>
                      </div>
                    )}
                    {msg.toolCall?.result && (
                      <pre>{msg.toolCall.result}</pre>
                    )}
                    {msg.content && <div style={{ marginTop: msg.toolCall ? '12px' : '0' }}>{msg.content}</div>}
                    {msg.content === '' && msg.role === 'agent' && !msg.toolCall && isTyping && (
                      <div className="tool-status" style={{ color: 'var(--text-secondary)' }}>
                        <Loader2 size={16} className="spinner" /> Thinking...
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-container glass-panel">
          <div className="input-box glass-panel">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask me to prioritize a backlog or generate a roadmap..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
