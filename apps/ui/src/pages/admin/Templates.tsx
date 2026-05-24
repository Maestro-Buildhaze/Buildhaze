import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Folder, File, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useDropzone } from 'react-dropzone';

interface FileWithPath {
  file: File;
  path: string;
}

export function Templates() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [templateData, setTemplateData] = useState({
    name: '',
    slug: '',
    niche: 'lawyer',
    description: '',
  });

  // Get templates list
  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: api.admin.getTemplates,
  });

  // Delete template mutation
  const deleteMut = useMutation({
    mutationFn: api.admin.deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
  });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithPath = acceptedFiles.map(file => {
      // Try to get relative path from webkitRelativePath or build from name
      const path = (file as any).webkitRelativePath || file.name;
      return { file, path };
    });
    setSelectedFiles(filesWithPath);
    
    // Auto-fill slug from folder name if available
    if (filesWithPath.length > 0) {
      const firstPath = filesWithPath[0].path;
      const folderName = firstPath.split('/')[0];
      if (folderName && !templateData.slug) {
        setTemplateData(prev => ({ ...prev, slug: folderName.toLowerCase().replace(/\s+/g, '-') }));
      }
    }
  }, [templateData.slug]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
  });

  // Upload template to R2 and register in CMS
  const handleUpload = async () => {
    if (!templateData.name || !templateData.slug || selectedFiles.length === 0) {
      alert('Completează toate câmpurile și selectează fișierele');
      return;
    }

    setUploading(true);
    setUploadProgress('Upload fișiere în Cloudflare R2...');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      selectedFiles.forEach(({ file, path }) => {
        formData.append('files', file);
        formData.append('paths', path);
      });
      formData.append('templateSlug', templateData.slug);

      // Upload files to R2 via API
      await api.admin.uploadTemplateFiles(formData, (progress) => {
        setUploadProgress(`Upload... ${progress}%`);
      });

      // Register template in CMS
      setUploadProgress('Înregistrare template în CMS...');
      await api.admin.createTemplate({
        ...templateData,
        r2Key: `templates/${templateData.slug}`,
      });

      setUploadProgress('✅ Template încărcat cu succes!');
      setSelectedFiles([]);
      setTemplateData({ name: '', slug: '', niche: 'lawyer', description: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      
      setTimeout(() => setUploadProgress(''), 3000);
    } catch (err: any) {
      setUploadProgress(`❌ Eroare: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Template-uri</h1>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Încarcă Template Nou</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nume Template
              </label>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ex: Lawyer Premium"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug (identificator unic)
              </label>
              <input
                type="text"
                value={templateData.slug}
                onChange={(e) => setTemplateData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="ex: lawyer-premium"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nisă
              </label>
              <select
                value={templateData.niche}
                onChange={(e) => setTemplateData(prev => ({ ...prev, niche: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="lawyer">Avocatură</option>
                <option value="medical">Medical</option>
                <option value="real-estate">Imobiliare</option>
                <option value="restaurant">Restaurante</option>
                <option value="ecommerce">E-commerce</option>
                <option value="portfolio">Portofoliu</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descriere
              </label>
              <textarea
                value={templateData.description}
                onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descriere scurtă..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fișiere Template (Drag & Drop sau Click)
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500'
              }`}
            >
              <input {...getInputProps()} directory="" webkitdirectory="" />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDragActive ? 'Drop fișierele aici...' : 'Drag & drop folder template sau click pentru a selecta'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Include index.html, css/, js/, imagini
              </p>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {selectedFiles.length} fișiere selectate:
                </p>
                <ul className="space-y-1">
                  {selectedFiles.slice(0, 10).map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                      {f.path.endsWith('.html') ? <File className="w-3 h-3 mr-1 text-blue-500" /> : <Folder className="w-3 h-3 mr-1 text-yellow-500" />}
                      {f.path}
                    </li>
                  ))}
                  {selectedFiles.length > 10 && (
                    <li className="text-xs text-gray-500">... și încă {selectedFiles.length - 10}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress && (
              <div className={`mt-4 p-3 rounded-lg text-sm flex items-center ${
                uploadProgress.includes('✅') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                uploadProgress.includes('❌') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
                 uploadProgress.includes('✅') ? <Check className="w-4 h-4 mr-2" /> :
                 uploadProgress.includes('❌') ? <AlertCircle className="w-4 h-4 mr-2" /> : null}
                {uploadProgress}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !templateData.name || !templateData.slug || selectedFiles.length === 0}
              className="mt-4 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {uploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
              {uploading ? 'Se încarcă...' : 'Încarcă Template'}
            </button>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Template-uri Existente</h3>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          </div>
        ) : templates?.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Niciun template încărcat încă.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {templates?.map((template: any) => (
              <div key={template.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mr-4">
                    <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {template.niche} • {template.slug} • R2: {template.r2Key}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMut.mutate(template.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/20"
                  title="Șterge template"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
