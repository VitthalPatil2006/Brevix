import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, FileText, MessageSquare, Sparkles, Mic, Volume2, Send, Download } from 'lucide-react';

export default function PDFViewer({ user, onLogout }) {
  const { pdfId } = useParams();
  const navigate = useNavigate();
  const [pdf, setPdf] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchPDF();
    fetchSummaries();
    fetchChatHistory();
  }, [pdfId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchPDF = async () => {
    try {
      const response = await axios.get(`${API}/pdf/${pdfId}`);
      setPdf(response.data);
    } catch (error) {
      toast.error('Failed to fetch PDF');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaries = async () => {
    try {
      const response = await axios.get(`${API}/summaries/${pdfId}`);
      setSummaries(response.data);
    } catch (error) {
      console.error('Failed to fetch summaries');
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history/${pdfId}?session_id=${sessionId}`);
      if (response.data.messages) {
        setChatMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch chat history');
    }
  };

  const handleSummarize = async (mode) => {
    setSummarizing(true);
    try {
      const response = await axios.post(`${API}/summarize`, {
        pdf_id: pdfId,
        mode,
        length: mode === 'custom' ? 200 : null,
      });
      setSummaries([response.data, ...summaries]);
      toast.success('Summary generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  const handleChat = async (message) => {
    if (!message.trim()) return;

    const userMessage = { user: message, timestamp: new Date().toISOString() };
    setChatMessages([...chatMessages, userMessage]);
    setChatMessage('');

    try {
      const response = await axios.post(`${API}/chat`, {
        pdf_id: pdfId,
        message,
        session_id: sessionId,
      });
      const assistantMessage = {
        assistant: response.data.response,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get response');
      setChatMessages((prev) => prev.slice(0, -1));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        try {
          const response = await axios.post(`${API}/voice/transcribe`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setChatMessage(response.data.text);
          toast.success('Transcription complete!');
        } catch (error) {
          toast.error('Failed to transcribe audio');
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech not supported');
    }
  };

  const exportSummary = (summary) => {
    const element = document.createElement('a');
    const file = new Blob([summary.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `summary-${summary.summary_type}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="glass-effect shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-to-dashboard"
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-800" data-testid="pdf-title">{pdf?.filename}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Summary & Chat */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-2 glass-effect">
                <TabsTrigger value="summary" data-testid="summary-tab">Summary</TabsTrigger>
                <TabsTrigger value="chat" data-testid="chat-tab">Chat</TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <Card className="glass-effect shadow-xl">
                  <CardHeader>
                    <h3 className="text-xl font-bold text-gray-800">Generate Summary</h3>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        onClick={() => handleSummarize('brief')}
                        data-testid="brief-summary-button"
                        disabled={summarizing}
                        className="btn-primary text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Brief Summary
                      </Button>
                      <Button
                        onClick={() => handleSummarize('detailed')}
                        data-testid="detailed-summary-button"
                        disabled={summarizing}
                        className="btn-secondary text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Detailed Summary
                      </Button>
                      <Button
                        onClick={() => handleSummarize('custom')}
                        data-testid="custom-summary-button"
                        disabled={summarizing}
                        variant="outline"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Custom (200 words)
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {summarizing && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600">Generating summary...</span>
                      </div>
                    )}
                    <div className="space-y-4" data-testid="summaries-container">
                      {summaries.map((summary) => (
                        <div
                          key={summary.id}
                          className="p-4 bg-white/50 rounded-lg border border-indigo-200"
                          data-testid={`summary-${summary.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-indigo-600 uppercase">
                              {summary.summary_type}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => speakText(summary.content)}
                                data-testid={`speak-summary-${summary.id}`}
                              >
                                <Volume2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => exportSummary(summary)}
                                data-testid={`export-summary-${summary.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{summary.content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(summary.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat">
                <Card className="glass-effect shadow-xl">
                  <CardHeader>
                    <h3 className="text-xl font-bold text-gray-800">Chat with Document</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 h-96 overflow-y-auto mb-4" data-testid="chat-messages">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className="chat-message">
                          {msg.user && (
                            <div className="flex justify-end mb-2">
                              <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-md" data-testid="user-message">
                                {msg.user}
                              </div>
                            </div>
                          )}
                          {msg.assistant && (
                            <div className="flex justify-start mb-2">
                              <div className="bg-white/70 text-gray-800 px-4 py-2 rounded-2xl rounded-tl-sm max-w-md shadow-sm" data-testid="assistant-message">
                                {msg.assistant}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        data-testid="voice-input-button"
                        variant="outline"
                        className={isRecording ? 'bg-red-100' : ''}
                      >
                        <Mic className={`w-4 h-4 ${isRecording ? 'text-red-600' : ''}`} />
                      </Button>
                      <Input
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleChat(chatMessage)}
                        placeholder="Ask a question about the document..."
                        data-testid="chat-input"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleChat(chatMessage)}
                        data-testid="send-chat-button"
                        className="btn-primary text-white"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Document Info */}
          <div className="space-y-6">
            <Card className="glass-effect shadow-xl" data-testid="document-info">
              <CardHeader>
                <h3 className="text-xl font-bold text-gray-800">Document Info</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Filename</p>
                  <p className="font-medium text-gray-800">{pdf?.filename}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pages</p>
                  <p className="font-medium text-gray-800">{pdf?.page_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Uploaded</p>
                  <p className="font-medium text-gray-800">
                    {pdf?.upload_date && new Date(pdf.upload_date).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Size</p>
                  <p className="font-medium text-gray-800">
                    {pdf?.file_size && (pdf.file_size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium text-green-600 capitalize">{pdf?.status}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect shadow-xl">
              <CardHeader>
                <h3 className="text-xl font-bold text-gray-800">Document Preview</h3>
              </CardHeader>
              <CardContent>
                <div className="bg-white/50 p-4 rounded-lg border border-indigo-200 max-h-96 overflow-y-auto" data-testid="document-preview">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {pdf?.text_content?.substring(0, 1000)}...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}