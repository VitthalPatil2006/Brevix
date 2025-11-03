import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Upload, FileText, LogOut, Trash2, Eye } from 'lucide-react';

export default function Dashboard({ user, onLogout }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      const response = await axios.get(`${API}/pdf/list`);
      setPdfs(response.data);
    } catch (error) {
      toast.error('Failed to fetch PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/pdf/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('PDF uploaded successfully!');
      setPdfs([response.data, ...pdfs]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (pdfId) => {
    if (!window.confirm('Are you sure you want to delete this PDF?')) return;

    try {
      await axios.delete(`${API}/pdf/${pdfId}`);
      toast.success('PDF deleted successfully');
      setPdfs(pdfs.filter((pdf) => pdf.id !== pdfId));
    } catch (error) {
      toast.error('Failed to delete PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="glass-effect shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Brevix</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium" data-testid="user-name">{user.username}</span>
            <Button
              onClick={onLogout}
              data-testid="logout-button"
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <Card className="mb-8 glass-effect shadow-xl" data-testid="upload-section">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Upload Your PDF</h2>
              <p className="text-gray-600 mb-6">Get instant summaries, chat with your documents, and more</p>
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-3 px-8 py-4 btn-primary text-white font-medium rounded-xl shadow-lg">
                  <Upload className="w-5 h-5" />
                  {uploading ? 'Uploading...' : 'Choose PDF File'}
                </div>
                <input
                  id="pdf-upload"
                  data-testid="pdf-upload-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* PDF List */}
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Your Documents</h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : pdfs.length === 0 ? (
            <Card className="glass-effect shadow-lg">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No documents yet. Upload your first PDF to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="pdf-list">
              {pdfs.map((pdf) => (
                <Card key={pdf.id} className="glass-effect shadow-lg hover:shadow-xl transition-all" data-testid={`pdf-card-${pdf.id}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <FileText className="w-10 h-10 text-indigo-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate" data-testid="pdf-filename">{pdf.filename}</h4>
                        <p className="text-sm text-gray-600">{pdf.page_count} pages</p>
                        <p className="text-xs text-gray-500">
                          {new Date(pdf.upload_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/pdf/${pdf.id}`)}
                        data-testid={`view-pdf-button-${pdf.id}`}
                        className="flex-1 btn-primary text-white flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        onClick={() => handleDelete(pdf.id)}
                        data-testid={`delete-pdf-button-${pdf.id}`}
                        variant="outline"
                        className="px-4 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}